import { useSyncExternalStore } from "react";

export type SholatStatus = "ontime" | "late" | "miss";
export const SHOLAT_KEYS = ["subuh", "dzuhur", "ashar", "maghrib", "isya"] as const;
export type SholatKey = (typeof SHOLAT_KEYS)[number];

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
}

export interface Santri {
  id: string;
  nama: string;
  kelas: string;
  asrama: string;
}

const STORAGE_KEY = "ibadah-data-v1";
const SANTRI_KEY = "santri-data-v1";
const ACTIVE_KEY = "active-santri-v1";
const SYNC_CHANNEL = "ibadah-sync-v1";

interface Store {
  entries: IbadahEntry[];
  santri: Santri[];
  activeSantriId: string;
}

const DEFAULT_SANTRI: Santri[] = [
  { id: "s1", nama: "Ahmad Faiz Rahman", kelas: "X-A", asrama: "Al-Furqan" },
  { id: "s2", nama: "Muhammad Hafidz", kelas: "X-A", asrama: "Al-Furqan" },
  { id: "s3", nama: "Yusuf Abdurrahman", kelas: "X-B", asrama: "Al-Hikmah" },
  { id: "s4", nama: "Bilal Ar-Rasyid", kelas: "XI-A", asrama: "Al-Furqan" },
  { id: "s5", nama: "Umar Khalifah", kelas: "XI-A", asrama: "Al-Hikmah" },
  { id: "s6", nama: "Zaid bin Tsabit", kelas: "XI-B", asrama: "Al-Furqan" },
  { id: "s7", nama: "Abdullah Mubarak", kelas: "XII-A", asrama: "Al-Hikmah" },
  { id: "s8", nama: "Salman Al-Farisi", kelas: "XII-A", asrama: "Al-Furqan" },
];

let store: Store = { entries: [], santri: DEFAULT_SANTRI, activeSantriId: "s1" };
let initialized = false;
let syncBound = false;
let syncChannel: BroadcastChannel | null = null;
const listeners = new Set<() => void>();

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
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as IbadahEntry[];
  } catch {
    return [];
  }
}

function readSantri() {
  if (typeof window === "undefined") return DEFAULT_SANTRI;
  try {
    const raw = localStorage.getItem(SANTRI_KEY);
    if (raw) return JSON.parse(raw) as Santri[];
    localStorage.setItem(SANTRI_KEY, JSON.stringify(DEFAULT_SANTRI));
    return DEFAULT_SANTRI;
  } catch {
    return DEFAULT_SANTRI;
  }
}

function loadStore(): Store {
  if (typeof window === "undefined") {
    return { entries: [], santri: DEFAULT_SANTRI, activeSantriId: "s1" };
  }

  let entries = readEntries();
  const santri = readSantri();
  const activeSantriId = getActiveSantriId();

  if (entries.length === 0) {
    entries = seedEntries(santri);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  return { entries, santri, activeSantriId };
}

function refreshSharedState() {
  if (typeof window === "undefined") return;
  store = {
    entries: readEntries(),
    santri: readSantri(),
    activeSantriId: getActiveSantriId(),
  };
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
    refreshSharedState();
    emit();
  };

  window.addEventListener("storage", (event) => {
    if (!event.key || event.key === STORAGE_KEY || event.key === SANTRI_KEY) {
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
  sessionStorage.setItem(ACTIVE_KEY, store.activeSantriId);
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
  const index = store.entries.findIndex(
    (item) => item.date === entry.date && item.santriId === entry.santriId,
  );
  const nextEntries = [...store.entries];

  if (index >= 0) nextEntries[index] = entry;
  else nextEntries.push(entry);

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
}

export function getEntry(date: string, santriId: string): IbadahEntry | undefined {
  ensureInit();
  return store.entries.find((entry) => entry.date === date && entry.santriId === santriId);
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
  };
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
