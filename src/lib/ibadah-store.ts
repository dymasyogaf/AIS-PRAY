import { useSyncExternalStore } from "react";

export type SholatStatus = "ontime" | "late" | "miss";
export const SHOLAT_KEYS = ["subuh", "dzuhur", "ashar", "maghrib", "isya"] as const;
export type SholatKey = (typeof SHOLAT_KEYS)[number];
export type SantriGender = "putra" | "putri";
export type SupervisorRole = "musyrif" | "musyrifah";

export interface SupervisorNote {
  text: string;
  updatedAt: string | null;
  readAt: string | null;
}

export interface IbadahEntry {
  date: string;
  santriId: string;
  sholat: Record<SholatKey, SholatStatus>;
  tilawahMenit: number;
  tilawahHalaman: number;
  tahfidzBaru: number;
  tahfidzMurajaah: number;
  qiyamRakaat: number;
  puasa: boolean;
  adab: number;
  catatan: string;
  catatanPembina: SupervisorNote;
}

export interface Santri {
  id: string;
  nama: string;
  kelas: string;
  asrama: string;
  gender: SantriGender;
  supervisorRole: SupervisorRole;
  profileType?: "default" | "dummy";
}

export interface PembinaanFollowUp {
  santriId: string;
  catatan: string;
  selesai: boolean;
  updatedAt: string | null;
  selesaiAt: string | null;
}

const STORAGE_KEY = "ibadah-data-v1";
const SANTRI_KEY = "santri-data-v1";
const ACTIVE_KEY = "active-santri-v1";
const SYNC_CHANNEL = "ibadah-sync-v1";
const PEMBINAAN_KEY = "pembinaan-data-v1";
const SYNC_POLL_MS = 1000;

interface Store {
  entries: IbadahEntry[];
  santri: Santri[];
  activeSantriId: string;
  pembinaan: Record<string, PembinaanFollowUp>;
}

const DEFAULT_SANTRI: Santri[] = [
  { id: "s1", nama: "Ahmad Faiz Rahman", kelas: "X-A", asrama: "Al-Furqan", gender: "putra" },
  { id: "s2", nama: "Muhammad Hafidz", kelas: "X-A", asrama: "Al-Furqan", gender: "putra" },
  { id: "s3", nama: "Yusuf Abdurrahman", kelas: "X-B", asrama: "Al-Hikmah", gender: "putra" },
  { id: "s4", nama: "Bilal Ar-Rasyid", kelas: "XI-A", asrama: "Al-Furqan", gender: "putra" },
  { id: "s5", nama: "Aisyah Zahra", kelas: "X-A", asrama: "An-Nisa", gender: "putri" },
  { id: "s6", nama: "Khadijah Humaira", kelas: "X-B", asrama: "An-Nisa", gender: "putri" },
  { id: "s7", nama: "Maryam Safitri", kelas: "XI-A", asrama: "Al-Hikmah Putri", gender: "putri" },
  { id: "s8", nama: "Safiyya Nabila", kelas: "XII-A", asrama: "Al-Hikmah Putri", gender: "putri" },
].map((item) => ({
  ...item,
  supervisorRole: item.gender === "putra" ? "musyrif" : "musyrifah",
  profileType: "default" as const,
}));

function normalizeSantri(
  input: Array<
    Omit<Santri, "gender" | "supervisorRole" | "profileType"> & {
      gender?: SantriGender;
      supervisorRole?: SupervisorRole;
      profileType?: "default" | "dummy";
    }
  >,
) {
  return input.map((item) => {
    const fallback = DEFAULT_SANTRI.find((santri) => santri.id === item.id);
    const gender = item.gender ?? fallback?.gender ?? "putra";
    return {
      ...item,
      gender,
      supervisorRole:
        item.supervisorRole ??
        fallback?.supervisorRole ??
        (gender === "putra" ? "musyrif" : "musyrifah"),
      profileType: item.profileType ?? fallback?.profileType ?? "default",
    };
  });
}

let store: Store = { entries: [], santri: DEFAULT_SANTRI, activeSantriId: "s1", pembinaan: {} };
let initialized = false;
let syncBound = false;
let syncChannel: BroadcastChannel | null = null;
let syncInterval: number | null = null;
const listeners = new Set<() => void>();
let lastEntriesRaw = "";
let lastSantriRaw = "";
let lastActiveSantriId = "s1";
let lastPembinaanRaw = "";

function getActiveSantriId() {
  if (typeof window === "undefined") return "s1";
  try {
    return sessionStorage.getItem(ACTIVE_KEY) || "s1";
  } catch {
    return "s1";
  }
}

function readEntries() {
  if (typeof window === "undefined") return [];
  try {
    return normalizeEntries(JSON.parse(readEntriesRaw() || "[]") as Partial<IbadahEntry>[]);
  } catch {
    return [];
  }
}

function normalizeEntries(input: Partial<IbadahEntry>[]) {
  return input.map((entry) => ({
    date: entry.date ?? "",
    santriId: entry.santriId ?? "",
    sholat: {
      subuh: entry.sholat?.subuh ?? "miss",
      dzuhur: entry.sholat?.dzuhur ?? "miss",
      ashar: entry.sholat?.ashar ?? "miss",
      maghrib: entry.sholat?.maghrib ?? "miss",
      isya: entry.sholat?.isya ?? "miss",
    },
    tilawahMenit: entry.tilawahMenit ?? 0,
    tilawahHalaman: entry.tilawahHalaman ?? 0,
    tahfidzBaru: entry.tahfidzBaru ?? 0,
    tahfidzMurajaah: entry.tahfidzMurajaah ?? 0,
    qiyamRakaat: entry.qiyamRakaat ?? 0,
    puasa: entry.puasa ?? false,
    adab: entry.adab ?? 3,
    catatan: entry.catatan ?? "",
    catatanPembina: normalizeSupervisorNote(entry.catatanPembina),
  }));
}

function normalizeSupervisorNote(input: Partial<SupervisorNote> | string | undefined) {
  if (typeof input === "string") {
    return {
      text: input,
      updatedAt: input.trim() ? new Date(0).toISOString() : null,
      readAt: null,
    } satisfies SupervisorNote;
  }

  return {
    text: input?.text ?? "",
    updatedAt: input?.updatedAt ?? null,
    readAt: input?.readAt ?? null,
  } satisfies SupervisorNote;
}

function readEntriesRaw() {
  if (typeof window === "undefined") return "[]";
  try {
    return localStorage.getItem(STORAGE_KEY) || "[]";
  } catch {
    return "[]";
  }
}

function readSantri() {
  if (typeof window === "undefined") return DEFAULT_SANTRI;
  try {
    const raw = readSantriRaw();
    if (raw)
      return normalizeSantri(
        JSON.parse(raw) as Array<
          Omit<Santri, "gender" | "supervisorRole" | "profileType"> & {
            gender?: SantriGender;
            supervisorRole?: SupervisorRole;
            profileType?: "default" | "dummy";
          }
        >,
      );
    localStorage.setItem(SANTRI_KEY, JSON.stringify(DEFAULT_SANTRI));
    return DEFAULT_SANTRI;
  } catch {
    return DEFAULT_SANTRI;
  }
}

function readPembinaan() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(readPembinaanRaw() || "{}") as Record<string, PembinaanFollowUp>;
  } catch {
    return {};
  }
}

function readSantriRaw() {
  if (typeof window === "undefined") return JSON.stringify(DEFAULT_SANTRI);
  try {
    return localStorage.getItem(SANTRI_KEY) || "";
  } catch {
    return "";
  }
}

function readPembinaanRaw() {
  if (typeof window === "undefined") return "{}";
  try {
    return localStorage.getItem(PEMBINAAN_KEY) || "{}";
  } catch {
    return "{}";
  }
}

function rememberSnapshot(
  entriesRaw: string,
  santriRaw: string,
  activeSantriId: string,
  pembinaanRaw: string,
) {
  lastEntriesRaw = entriesRaw;
  lastSantriRaw = santriRaw;
  lastActiveSantriId = activeSantriId;
  lastPembinaanRaw = pembinaanRaw;
}

function getSnapshot() {
  const entriesRaw = readEntriesRaw();
  const santriRaw = readSantriRaw();
  const activeSantriId = getActiveSantriId();
  const pembinaanRaw = readPembinaanRaw();

  return { entriesRaw, santriRaw, activeSantriId, pembinaanRaw };
}

function loadStore(): Store {
  if (typeof window === "undefined") {
    return { entries: [], santri: DEFAULT_SANTRI, activeSantriId: "s1", pembinaan: {} };
  }

  let entries = readEntries();
  const santri = readSantri();
  const activeSantriId = getActiveSantriId();
  const pembinaan = readPembinaan();

  if (entries.length === 0) {
    entries = seedEntries(santri);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  rememberSnapshot(readEntriesRaw(), readSantriRaw(), activeSantriId, readPembinaanRaw());
  return { entries, santri, activeSantriId, pembinaan };
}

function refreshSharedState() {
  if (typeof window === "undefined") return;
  const nextSnapshot = getSnapshot();
  const hasChanged =
    nextSnapshot.entriesRaw !== lastEntriesRaw ||
    nextSnapshot.santriRaw !== lastSantriRaw ||
    nextSnapshot.activeSantriId !== lastActiveSantriId ||
    nextSnapshot.pembinaanRaw !== lastPembinaanRaw;

  if (!hasChanged) return false;

  store = {
    entries: normalizeEntries(JSON.parse(nextSnapshot.entriesRaw || "[]") as Partial<IbadahEntry>[]),
    santri: nextSnapshot.santriRaw
      ? normalizeSantri(
          JSON.parse(nextSnapshot.santriRaw) as Array<
            Omit<Santri, "gender" | "supervisorRole" | "profileType"> & {
              gender?: SantriGender;
              supervisorRole?: SupervisorRole;
              profileType?: "default" | "dummy";
            }
          >,
        )
      : DEFAULT_SANTRI,
    activeSantriId: nextSnapshot.activeSantriId,
    pembinaan: JSON.parse(nextSnapshot.pembinaanRaw || "{}") as Record<string, PembinaanFollowUp>,
  };
  rememberSnapshot(
    nextSnapshot.entriesRaw,
    nextSnapshot.santriRaw,
    nextSnapshot.activeSantriId,
    nextSnapshot.pembinaanRaw,
  );
  return true;
}

function emit() {
  listeners.forEach((listener) => listener());
}

function broadcastSync() {
  syncChannel?.postMessage({ type: "sync" });
}

function bindRealtimeSync() {
  if (syncBound || typeof window === "undefined") return;

  const handleSync = () => {
    if (refreshSharedState()) {
      emit();
    }
  };

  window.addEventListener("storage", (event) => {
    if (
      !event.key ||
      event.key === STORAGE_KEY ||
      event.key === SANTRI_KEY ||
      event.key === ACTIVE_KEY ||
      event.key === PEMBINAAN_KEY
    ) {
      handleSync();
    }
  });

  window.addEventListener("focus", handleSync);
  window.addEventListener("pageshow", handleSync);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      handleSync();
    }
  });

  if (typeof BroadcastChannel !== "undefined") {
    syncChannel = new BroadcastChannel(SYNC_CHANNEL);
    syncChannel.addEventListener("message", (event) => {
      if (event.data?.type === "sync") {
        handleSync();
      }
    });
  }

  // Fallback for tabs/browser contexts where storage or BroadcastChannel events are delayed.
  syncInterval = window.setInterval(handleSync, SYNC_POLL_MS);
  syncBound = true;
}

function ensureInit() {
  if (!initialized && typeof window !== "undefined") {
    store = loadStore();
    bindRealtimeSync();
    initialized = true;
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store.entries));
  localStorage.setItem(SANTRI_KEY, JSON.stringify(store.santri));
  localStorage.setItem(PEMBINAAN_KEY, JSON.stringify(store.pembinaan));
  sessionStorage.setItem(ACTIVE_KEY, store.activeSantriId);
  rememberSnapshot(readEntriesRaw(), readSantriRaw(), store.activeSantriId, readPembinaanRaw());
}

function subscribe(listener: () => void) {
  ensureInit();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function seedEntries(santri: Santri[]): IbadahEntry[] {
  const out: IbadahEntry[] = [];
  const today = new Date();

  for (let d = 29; d >= 0; d--) {
    const date = new Date(today);
    date.setDate(today.getDate() - d);
    const dateString = date.toISOString().slice(0, 10);

    santri.forEach((item, idx) => {
      const seed = (d * 7 + idx * 13) % 100;
      const rand = (min: number, max: number) => min + ((seed * (idx + 1)) % (max - min + 1));
      const sholatStatuses: SholatStatus[] = ["ontime", "ontime", "ontime", "late", "miss"];
      const sholat = Object.fromEntries(
        SHOLAT_KEYS.map((key, i) => [key, sholatStatuses[(seed + i) % 5]]),
      ) as Record<SholatKey, SholatStatus>;

      out.push({
        date: dateString,
        santriId: item.id,
        sholat,
        tilawahMenit: rand(10, 60),
        tilawahHalaman: rand(1, 8),
        tahfidzBaru: idx % 3 === 0 ? rand(0, 2) : 0,
        tahfidzMurajaah: rand(1, 5),
        qiyamRakaat: seed % 3 === 0 ? 0 : rand(2, 8),
        puasa: seed % 7 === 0,
        adab: ((seed + idx) % 5) + 1,
        catatan: "",
        catatanPembina: {
          text: "",
          updatedAt: null,
          readAt: null,
        },
      });
    });
  }

  return out;
}

export function useStore<T>(selector: (s: Store) => T): T {
  ensureInit();
  return useSyncExternalStore(
    subscribe,
    () => selector(store),
    () => selector(store),
  );
}

export function upsertEntry(entry: IbadahEntry) {
  ensureInit();
  const normalizedEntry = {
    ...entry,
    catatan: entry.catatan ?? "",
    catatanPembina: normalizeSupervisorNote(entry.catatanPembina),
  };
  const index = store.entries.findIndex(
    (item) => item.date === entry.date && item.santriId === entry.santriId,
  );
  const nextEntries = [...store.entries];

  if (index >= 0) nextEntries[index] = normalizedEntry;
  else nextEntries.push(normalizedEntry);

  store = { ...store, entries: nextEntries };
  persist();
  emit();
  broadcastSync();
}

export function setActiveSantri(id: string) {
  ensureInit();
  store = { ...store, activeSantriId: id };
  persist();
  emit();
  broadcastSync();
}

export function updatePembinaanFollowUp(
  santriId: string,
  next: Partial<Pick<PembinaanFollowUp, "catatan" | "selesai">>,
) {
  ensureInit();
  const current = store.pembinaan[santriId] ?? {
    santriId,
    catatan: "",
    selesai: false,
    updatedAt: null,
    selesaiAt: null,
  };
  const now = new Date().toISOString();
  const selesai = next.selesai ?? current.selesai;
  const pembinaan: PembinaanFollowUp = {
    ...current,
    ...next,
    selesai,
    updatedAt: now,
    selesaiAt: selesai ? (current.selesaiAt ?? now) : null,
  };

  store = {
    ...store,
    pembinaan: {
      ...store.pembinaan,
      [santriId]: pembinaan,
    },
  };
  persist();
  emit();
  broadcastSync();
}

export function createDummySantriProfile(input: {
  nama: string;
  gender: SantriGender;
  supervisorRole: SupervisorRole;
  kelas: string;
}) {
  ensureInit();

  const nextId = `s${Date.now()}`;
  const profile: Santri = {
    id: nextId,
    nama: input.nama.trim(),
    gender: input.gender,
    kelas: input.kelas,
    asrama: input.gender === "putra" ? "Binaan Musyrif" : "Binaan Musyrifah",
    supervisorRole: input.supervisorRole,
    profileType: "dummy",
  };

  store = {
    ...store,
    santri: [...store.santri, profile],
  };
  persist();
  emit();
  broadcastSync();

  return profile;
}

export function getSantriList() {
  ensureInit();
  return store.santri;
}

export function getActiveSantriIdValue() {
  ensureInit();
  return store.activeSantriId;
}

export function getEntry(date: string, santriId: string): IbadahEntry | undefined {
  ensureInit();
  return store.entries.find((entry) => entry.date === date && entry.santriId === santriId);
}

export function updateEntrySupervisorNote(date: string, santriId: string, catatanPembina: string) {
  ensureInit();
  const index = store.entries.findIndex(
    (entry) => entry.date === date && entry.santriId === santriId,
  );

  if (index < 0) return false;

  const nextEntries = [...store.entries];
  const currentNote = normalizeSupervisorNote(nextEntries[index].catatanPembina);
  const nextText = catatanPembina.trim();
  const hasChanged = currentNote.text !== nextText;
  const updatedAt = hasChanged ? new Date().toISOString() : currentNote.updatedAt;
  nextEntries[index] = {
    ...nextEntries[index],
    catatanPembina: {
      text: nextText,
      updatedAt: nextText ? updatedAt : null,
      readAt: hasChanged ? null : currentNote.readAt,
    },
  };

  store = { ...store, entries: nextEntries };
  persist();
  emit();
  broadcastSync();
  return true;
}

export function markSupervisorNoteAsRead(date: string, santriId: string) {
  ensureInit();
  const index = store.entries.findIndex(
    (entry) => entry.date === date && entry.santriId === santriId,
  );

  if (index < 0) return false;

  const current = store.entries[index];
  const note = normalizeSupervisorNote(current.catatanPembina);
  if (!note.text.trim() || !hasUnreadSupervisorNote(current)) return false;

  const nextEntries = [...store.entries];
  nextEntries[index] = {
    ...current,
    catatanPembina: {
      ...note,
      readAt: new Date().toISOString(),
    },
  };

  store = { ...store, entries: nextEntries };
  persist();
  emit();
  broadcastSync();
  return true;
}

export function emptyEntry(date: string, santriId: string): IbadahEntry {
  return {
    date,
    santriId,
    sholat: {
      subuh: "miss",
      dzuhur: "miss",
      ashar: "miss",
      maghrib: "miss",
      isya: "miss",
    },
    tilawahMenit: 0,
    tilawahHalaman: 0,
    tahfidzBaru: 0,
    tahfidzMurajaah: 0,
    qiyamRakaat: 0,
    puasa: false,
    adab: 3,
    catatan: "",
    catatanPembina: {
      text: "",
      updatedAt: null,
      readAt: null,
    },
  };
}

export function hasUnreadSupervisorNote(entry: IbadahEntry) {
  const note = normalizeSupervisorNote(entry.catatanPembina);
  if (!note.text.trim() || !note.updatedAt) return false;
  if (!note.readAt) return true;
  return note.readAt < note.updatedAt;
}

export function hasReadSupervisorNote(entry: IbadahEntry) {
  const note = normalizeSupervisorNote(entry.catatanPembina);
  return Boolean(note.text.trim()) && !hasUnreadSupervisorNote(entry);
}

export interface ScoreBreakdown {
  sholat: number;
  tilawah: number;
  tahfidz: number;
  qiyam: number;
  puasa: number;
  adab: number;
  total: number;
}

export function scoreEntry(entry: IbadahEntry): ScoreBreakdown {
  const sholatPts = Object.values(entry.sholat).reduce((acc, status) => {
    if (status === "ontime") return acc + 6;
    if (status === "late") return acc + 2;
    return acc;
  }, 0);
  const tilawah = entry.tilawahHalaman >= 1 ? 15 : entry.tilawahMenit > 0 ? 5 : 0;
  const tahfidz = entry.tahfidzBaru >= 1 ? 15 : entry.tahfidzMurajaah >= 1 ? 10 : 0;
  const qiyam = entry.qiyamRakaat >= 2 ? 15 : entry.qiyamRakaat === 1 ? 8 : 0;
  const puasa = entry.puasa ? 10 : 0;
  const adabMap: Record<number, number> = { 1: 3, 2: 6, 3: 9, 4: 12, 5: 15 };
  const adab = adabMap[entry.adab] ?? 0;
  const total = sholatPts + tilawah + tahfidz + qiyam + puasa + adab;

  return { sholat: sholatPts, tilawah, tahfidz, qiyam, puasa, adab, total };
}

export function statusOf(score: number): {
  label: string;
  tone: "success" | "warning" | "danger";
} {
  if (score >= 80) return { label: "Rajin", tone: "success" };
  if (score >= 60) return { label: "Cukup", tone: "warning" };
  return { label: "Perlu Pembinaan", tone: "danger" };
}

export function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export function lastNDates(n: number): string[] {
  const out: string[] = [];
  const today = new Date();

  for (let i = n - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    out.push(date.toISOString().slice(0, 10));
  }

  return out;
}

export function getPembinaanStreak(entries: IbadahEntry[], santriId: string) {
  const santriEntries = entries
    .filter((entry) => entry.santriId === santriId)
    .sort((left, right) => left.date.localeCompare(right.date));

  let pembinaanStreak = 0;
  for (let index = santriEntries.length - 1; index >= 0; index -= 1) {
    const isPembinaan = statusOf(scoreEntry(santriEntries[index]).total).tone === "danger";
    if (!isPembinaan) break;
    pembinaanStreak += 1;
  }

  return pembinaanStreak;
}
