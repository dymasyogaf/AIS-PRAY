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
  profileType?: "default" | "custom";
  jurusan?: string;
}

export interface PembinaanFollowUp {
  santriId: string;
  catatan: string;
  selesai: boolean;
  updatedAt: string | null;
  selesaiAt: string | null;
}

const STORAGE_KEY = "ibadah-data-v2";
const SANTRI_KEY = "santri-data-v2";
const ACTIVE_KEY = "active-santri-v2";
const SYNC_CHANNEL = "ibadah-sync-v2";
const PEMBINAAN_KEY = "pembinaan-data-v2";
const SYNC_POLL_MS = 1000;
const SHEETS_API_PATH = "/api/sheets";
const REMOTE_SYNC_COOLDOWN_MS = 1200;

interface Store {
  entries: IbadahEntry[];
  santri: Santri[];
  activeSantriId: string;
  pembinaan: Record<string, PembinaanFollowUp>;
}

// Dummy santri removed

function normalizeSantri(
  input: Array<
    Omit<Santri, "id" | "gender" | "supervisorRole" | "profileType"> & {
      id?: string;
      santriId?: string;
      gender?: SantriGender;
      supervisorRole?: SupervisorRole;
      profileType?: "default" | "custom";
    }
  >,
) {
  return input.reduce<Santri[]>((santriList, item) => {
    const id = item.id ?? item.santriId ?? "";
    if (!id) return santriList;

    const gender = item.gender ?? "putra";

    santriList.push({
      id,
      nama: item.nama,
      kelas: item.kelas,
      asrama: item.asrama,
      gender,
      supervisorRole:
        item.supervisorRole ??
        (gender === "putra" ? "musyrif" : "musyrifah"),
      profileType: item.profileType ?? "default",
    });

    return santriList;
  }, []);
}

function formatDateLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

let store: Store = { entries: [], santri: [], activeSantriId: "s1", pembinaan: {} };
let initialized = false;
let syncBound = false;
let syncChannel: BroadcastChannel | null = null;
let syncInterval: number | null = null;
let remoteHydrationStarted = false;
let remoteSantriSeedStarted = false;
let remoteHydrationInFlight = false;
let lastRemoteHydrationAt = 0;
let lastKnownRouteKey = "";
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
  if (typeof window === "undefined") return [] as Santri[];
  try {
    const raw = readSantriRaw();
    if (raw)
      return normalizeSantri(
        JSON.parse(raw) as Array<
          Omit<Santri, "gender" | "supervisorRole" | "profileType"> & {
            gender?: SantriGender;
            supervisorRole?: SupervisorRole;
            profileType?: "default" | "custom";
          }
        >,
      );
    return [] as Santri[];
  } catch {
    return [] as Santri[];
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
  if (typeof window === "undefined") return "[]";
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
    return { entries: [], santri: [], activeSantriId: "s1", pembinaan: {} };
  }

  const entries = readEntries();
  const santri = readSantri();
  const activeSantriId = getActiveSantriId();
  const pembinaan = readPembinaan();

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
    entries: normalizeEntries(
      JSON.parse(nextSnapshot.entriesRaw || "[]") as Partial<IbadahEntry>[],
    ),
    santri: nextSnapshot.santriRaw
      ? normalizeSantri(
          JSON.parse(nextSnapshot.santriRaw) as Array<
            Omit<Santri, "gender" | "supervisorRole" | "profileType"> & {
              gender?: SantriGender;
              supervisorRole?: SupervisorRole;
              profileType?: "default" | "custom";
            }
          >,
        )
      : ([] as Santri[]),
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

function getRouteKey() {
  if (typeof window === "undefined") return "";
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function requestRemoteHydration(force = false) {
  if (typeof window === "undefined" || remoteHydrationInFlight) return;

  const now = Date.now();
  if (!force && now - lastRemoteHydrationAt < REMOTE_SYNC_COOLDOWN_MS) {
    return;
  }

  lastRemoteHydrationAt = now;
  remoteHydrationInFlight = true;

  void hydrateStoreFromSheets().finally(() => {
    remoteHydrationInFlight = false;
    lastRemoteHydrationAt = Date.now();
  });
}

function bindRealtimeSync() {
  if (syncBound || typeof window === "undefined") return;

  const handleSync = () => {
    if (refreshSharedState()) {
      emit();
    }
  };

  const handleRemoteSync = () => {
    requestRemoteHydration();
  };

  const handleRouteSync = () => {
    const nextRouteKey = getRouteKey();
    if (nextRouteKey === lastKnownRouteKey) return;
    lastKnownRouteKey = nextRouteKey;
    handleSync();
    handleRemoteSync();
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

  window.addEventListener("focus", () => {
    handleSync();
    handleRemoteSync();
  });
  window.addEventListener("pageshow", () => {
    handleSync();
    handleRemoteSync();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      handleSync();
      handleRemoteSync();
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

  lastKnownRouteKey = getRouteKey();
  const originalPushState = window.history.pushState.bind(window.history);
  window.history.pushState = function (...args) {
    originalPushState(...args);
    window.dispatchEvent(new Event("app:navigation"));
  };

  const originalReplaceState = window.history.replaceState.bind(window.history);
  window.history.replaceState = function (...args) {
    originalReplaceState(...args);
    window.dispatchEvent(new Event("app:navigation"));
  };

  window.addEventListener("popstate", handleRouteSync);
  window.addEventListener("hashchange", handleRouteSync);
  window.addEventListener("app:navigation", handleRouteSync);

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

  if (!remoteHydrationStarted && typeof window !== "undefined") {
    remoteHydrationStarted = true;
    requestRemoteHydration(true);
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

// seedEntries removed

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
  void syncEntryToSheets(normalizedEntry);
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
  void syncPembinaanToSheets(pembinaan);
}

export function createSantriProfile(input: {
  nama: string;
  gender: SantriGender;
  supervisorRole: SupervisorRole;
  kelas: string;
  asrama: string;
  jurusan?: string;
}) {
  ensureInit();

  const nextId = `s${Date.now()}`;
  const profile: Santri = {
    id: nextId,
    nama: input.nama.trim(),
    gender: input.gender,
    kelas: input.kelas,
    asrama: input.asrama,
    supervisorRole: input.supervisorRole,
    profileType: "custom",
    jurusan: input.jurusan,
  };

  store = {
    ...store,
    santri: [...store.santri, profile],
  };

  persist();
  emit();
  broadcastSync();
  void syncSantriToSheets(profile);

  return profile;
}

export function updateSantriProfile(
  id: string,
  input: {
    kelas?: string;
    asrama?: string;
    jurusan?: string;
  },
) {
  ensureInit();

  const index = store.santri.findIndex((s) => s.id === id);
  if (index === -1) return;

  const current = store.santri[index];
  const updatedProfile: Santri = {
    ...current,
    kelas: input.kelas ?? current.kelas,
    asrama: input.asrama ?? current.asrama,
    jurusan: input.jurusan ?? current.jurusan,
  };

  const nextSantri = [...store.santri];
  nextSantri[index] = updatedProfile;

  store = {
    ...store,
    santri: nextSantri,
  };

  persist();
  emit();
  broadcastSync();
  void syncSantriToSheets(updatedProfile);
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
  const nextEntry = {
    ...nextEntries[index],
    catatanPembina: {
      text: nextText,
      updatedAt: nextText ? updatedAt : null,
      readAt: hasChanged ? null : currentNote.readAt,
    },
  };
  nextEntries[index] = nextEntry;

  store = { ...store, entries: nextEntries };
  persist();
  emit();
  broadcastSync();
  void syncEntryToSheets(nextEntry);
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
  const nextEntry = {
    ...current,
    catatanPembina: {
      ...note,
      readAt: new Date().toISOString(),
    },
  };
  nextEntries[index] = nextEntry;

  store = { ...store, entries: nextEntries };
  persist();
  emit();
  broadcastSync();
  void syncEntryToSheets(nextEntry);
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
  return formatDateLocal(new Date());
}

export function lastNDates(n: number): string[] {
  const out: string[] = [];
  const today = new Date();

  for (let i = n - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    out.push(formatDateLocal(date));
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

interface RemoteSheetsData {
  santriPutra?: Array<Record<string, unknown>>;
  santriPutri?: Array<Record<string, unknown>>;
  ibadahPutra?: Array<Record<string, unknown>>;
  ibadahPutri?: Array<Record<string, unknown>>;
  pembinaanPutra?: Array<Record<string, unknown>>;
  pembinaanPutri?: Array<Record<string, unknown>>;
}

interface SheetsApiResponse {
  success?: boolean;
  configured?: boolean;
  message?: string;
  data?: RemoteSheetsData | null;
}

function findSantriById(santriId: string) {
  return store.santri.find((item) => item.id === santriId);
}

function toBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return Boolean(value);
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseRemoteDate(dateStr: string) {
  if (!dateStr) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) return dateStr.trim();
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) return formatDateLocal(date);
  return dateStr;
}

function normalizeRemoteEntry(row: Record<string, unknown>): Partial<IbadahEntry> {
  return {
    date: parseRemoteDate(String(row.date ?? "")),
    santriId: String(row.santriId ?? ""),
    sholat: {
      subuh: (row.subuh as SholatStatus | undefined) ?? "miss",
      dzuhur: (row.dzuhur as SholatStatus | undefined) ?? "miss",
      ashar: (row.ashar as SholatStatus | undefined) ?? "miss",
      maghrib: (row.maghrib as SholatStatus | undefined) ?? "miss",
      isya: (row.isya as SholatStatus | undefined) ?? "miss",
    },
    tilawahMenit: toNumber(row.tilawahMenit),
    tilawahHalaman: toNumber(row.tilawahHalaman),
    tahfidzBaru: toNumber(row.tahfidzBaru),
    tahfidzMurajaah: toNumber(row.tahfidzMurajaah),
    qiyamRakaat: toNumber(row.qiyamRakaat),
    puasa: toBoolean(row.puasa),
    adab: toNumber(row.adab),
    catatan: String(row.catatan ?? ""),
    catatanPembina: {
      text: String(row.catatanPembina ?? ""),
      updatedAt: row.catatanPembinaUpdatedAt ? String(row.catatanPembinaUpdatedAt) : null,
      readAt: row.catatanPembinaReadAt ? String(row.catatanPembinaReadAt) : null,
    },
  };
}

function normalizeRemotePembinaan(
  rows: Array<Record<string, unknown>>,
): Record<string, PembinaanFollowUp> {
  return rows.reduce<Record<string, PembinaanFollowUp>>((acc, row) => {
    const santriId = String(row.santriId ?? "");
    if (!santriId) return acc;

    acc[santriId] = {
      santriId,
      catatan: String(row.catatan ?? ""),
      selesai: toBoolean(row.selesai),
      updatedAt: row.updatedAt ? String(row.updatedAt) : null,
      selesaiAt: row.selesaiAt ? String(row.selesaiAt) : null,
    };

    return acc;
  }, {});
}

async function postSheetsAction(action: string, payload: unknown) {
  try {
    const response = await fetch(SHEETS_API_PATH, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, payload }),
    });

    return (await response.json()) as SheetsApiResponse;
  } catch (error) {
    console.error("Google Sheets sync failed:", error);
    return null;
  }
}

async function fetchSheetsData() {
  try {
    const response = await fetch(SHEETS_API_PATH);
    return (await response.json()) as SheetsApiResponse;
  } catch (error) {
    console.error("Google Sheets hydration failed:", error);
    return null;
  }
}

async function hydrateStoreFromSheets() {
  const response = await fetchSheetsData();
  if (!response?.success || !response.data) return;

  const remoteSantriRows = [
    ...(response.data.santriPutra ?? []),
    ...(response.data.santriPutri ?? []),
  ] as Array<
    Omit<Santri, "gender" | "supervisorRole" | "profileType"> & {
      gender?: SantriGender;
      supervisorRole?: SupervisorRole;
      profileType?: "default" | "custom";
    }
  >;
  const remoteEntryRows = [
    ...(response.data.ibadahPutra ?? []),
    ...(response.data.ibadahPutri ?? []),
  ] as Array<Record<string, unknown>>;
  const remotePembinaanRows = [
    ...(response.data.pembinaanPutra ?? []),
    ...(response.data.pembinaanPutri ?? []),
  ] as Array<Record<string, unknown>>;



  const remoteSantri = remoteSantriRows.length ? normalizeSantri(remoteSantriRows) : [];
  const remoteEntries = remoteEntryRows.length ? normalizeEntries(remoteEntryRows.map(normalizeRemoteEntry)) : [];
  const remotePembinaan = remotePembinaanRows.length ? normalizeRemotePembinaan(remotePembinaanRows) : {};

  const mergedSantri = [...store.santri];
  for (const rs of remoteSantri) {
    const idx = mergedSantri.findIndex((s) => s.id === rs.id);
    if (idx >= 0) mergedSantri[idx] = rs;
    else mergedSantri.push(rs);
  }

  const mergedEntries = [...store.entries];
  for (const re of remoteEntries) {
    const idx = mergedEntries.findIndex((e) => e.date === re.date && e.santriId === re.santriId);
    if (idx >= 0) mergedEntries[idx] = re;
    else mergedEntries.push(re);
  }

  const mergedPembinaan = { ...store.pembinaan };
  for (const [id, pb] of Object.entries(remotePembinaan)) {
    mergedPembinaan[id] = pb;
  }

  const nextStore: Store = {
    ...store,
    santri: remoteSantri.length ? mergedSantri : store.santri,
    entries: remoteEntries.length ? mergedEntries : store.entries,
    pembinaan: Object.keys(remotePembinaan).length ? mergedPembinaan : store.pembinaan,
    activeSantriId: store.activeSantriId,
  };

  if (!nextStore.santri.some((item) => item.id === nextStore.activeSantriId)) {
    nextStore.activeSantriId = nextStore.santri[0]?.id ?? "s1";
  }

  const hasChanged =
    JSON.stringify(nextStore.entries) !== JSON.stringify(store.entries) ||
    JSON.stringify(nextStore.santri) !== JSON.stringify(store.santri) ||
    JSON.stringify(nextStore.pembinaan) !== JSON.stringify(store.pembinaan) ||
    nextStore.activeSantriId !== store.activeSantriId;

  if (!hasChanged) return;

  store = nextStore;
  persist();
  emit();
  broadcastSync();
}

// seedSantriSheetsFromLocalStore removed

async function syncSantriToSheets(santri: Santri) {
  const response = await postSheetsAction("upsertSantri", {
    santriId: santri.id,
    nama: santri.nama,
    kelas: santri.kelas,
    asrama: santri.asrama,
    gender: santri.gender,
    supervisorRole: santri.supervisorRole,
    profileType: santri.profileType ?? "default",
  });

  if (response && response.success === false && response.configured !== false) {
    console.error("Google Sheets santri sync rejected:", response.message);
  }
}

async function syncEntryToSheets(entry: IbadahEntry) {
  const santri = findSantriById(entry.santriId);
  if (!santri) return;

  const response = await postSheetsAction("upsertIbadah", {
    date: entry.date,
    santriId: entry.santriId,
    nama: santri.nama,
    kelas: santri.kelas,
    asrama: santri.asrama,
    gender: santri.gender,
    supervisorRole: santri.supervisorRole,
    sholat: entry.sholat,
    tilawahMenit: entry.tilawahMenit,
    tilawahHalaman: entry.tilawahHalaman,
    tahfidzBaru: entry.tahfidzBaru,
    tahfidzMurajaah: entry.tahfidzMurajaah,
    qiyamRakaat: entry.qiyamRakaat,
    puasa: entry.puasa,
    adab: entry.adab,
    catatan: entry.catatan,
    catatanPembina: entry.catatanPembina,
  });

  if (response && response.success === false && response.configured !== false) {
    console.error("Google Sheets ibadah sync rejected:", response.message);
  }
}

async function syncPembinaanToSheets(pembinaan: PembinaanFollowUp) {
  const santri = findSantriById(pembinaan.santriId);
  if (!santri) return;

  const response = await postSheetsAction("upsertPembinaan", {
    santriId: pembinaan.santriId,
    nama: santri.nama,
    kelas: santri.kelas,
    asrama: santri.asrama,
    gender: santri.gender,
    supervisorRole: santri.supervisorRole,
    catatan: pembinaan.catatan,
    selesai: pembinaan.selesai,
    selesaiAt: pembinaan.selesaiAt,
  });

  if (response && response.success === false && response.configured !== false) {
    console.error("Google Sheets pembinaan sync rejected:", response.message);
  }
}
