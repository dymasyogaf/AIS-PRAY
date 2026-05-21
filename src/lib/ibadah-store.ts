import { useSyncExternalStore } from "react";

export type SholatStatus = "ontime" | "late" | "miss";
export const SHOLAT_KEYS = ["subuh", "dzuhur", "ashar", "maghrib", "isya"] as const;
export type SholatKey = (typeof SHOLAT_KEYS)[number];

export interface IbadahEntry {
  date: string; // YYYY-MM-DD
  santriId: string;
  sholat: Record<SholatKey, SholatStatus>;
  tilawahMenit: number;
  tilawahHalaman: number;
  tahfidzBaru: number;
  tahfidzMurajaah: number;
  qiyamRakaat: number;
  puasa: boolean;
  adab: number; // 1-5
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

function loadStore(): Store {
  if (typeof window === "undefined") {
    return { entries: [], santri: DEFAULT_SANTRI, activeSantriId: "s1" };
  }
  let entries: IbadahEntry[] = [];
  let santri: Santri[] = DEFAULT_SANTRI;
  let activeSantriId = "s1";
  try {
    entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {}
  try {
    const raw = localStorage.getItem(SANTRI_KEY);
    if (raw) santri = JSON.parse(raw);
    else localStorage.setItem(SANTRI_KEY, JSON.stringify(DEFAULT_SANTRI));
  } catch {}
  try {
    activeSantriId = localStorage.getItem(ACTIVE_KEY) || "s1";
  } catch {}

  // Seed sample entries for demo on first load
  if (entries.length === 0) {
    entries = seedEntries(santri);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }
  return { entries, santri, activeSantriId };
}

function seedEntries(santri: Santri[]): IbadahEntry[] {
  const out: IbadahEntry[] = [];
  const today = new Date();
  for (let d = 29; d >= 0; d--) {
    const date = new Date(today);
    date.setDate(today.getDate() - d);
    const ds = date.toISOString().slice(0, 10);
    santri.forEach((s, idx) => {
      const seed = (d * 7 + idx * 13) % 100;
      const rand = (min: number, max: number) => min + ((seed * (idx + 1)) % (max - min + 1));
      const sholatStatuses: SholatStatus[] = ["ontime", "ontime", "ontime", "late", "miss"];
      const sholat = Object.fromEntries(
        SHOLAT_KEYS.map((k, i) => [k, sholatStatuses[(seed + i) % 5]])
      ) as Record<SholatKey, SholatStatus>;
      out.push({
        date: ds,
        santriId: s.id,
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

let store: Store = { entries: [], santri: DEFAULT_SANTRI, activeSantriId: "s1" };
let initialized = false;
const listeners = new Set<() => void>();

function ensureInit() {
  if (!initialized && typeof window !== "undefined") {
    store = loadStore();
    initialized = true;
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store.entries));
  localStorage.setItem(SANTRI_KEY, JSON.stringify(store.santri));
  localStorage.setItem(ACTIVE_KEY, store.activeSantriId);
}

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  ensureInit();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useStore<T>(selector: (s: Store) => T): T {
  ensureInit();
  return useSyncExternalStore(
    subscribe,
    () => selector(store),
    () => selector(store)
  );
}

export function upsertEntry(entry: IbadahEntry) {
  ensureInit();
  const idx = store.entries.findIndex(
    (e) => e.date === entry.date && e.santriId === entry.santriId
  );
  const next = [...store.entries];
  if (idx >= 0) next[idx] = entry;
  else next.push(entry);
  store = { ...store, entries: next };
  persist();
  emit();
}

export function setActiveSantri(id: string) {
  ensureInit();
  store = { ...store, activeSantriId: id };
  persist();
  emit();
}

export function getEntry(date: string, santriId: string): IbadahEntry | undefined {
  ensureInit();
  return store.entries.find((e) => e.date === date && e.santriId === santriId);
}

export function emptyEntry(date: string, santriId: string): IbadahEntry {
  return {
    date,
    santriId,
    sholat: { subuh: "miss", dzuhur: "miss", ashar: "miss", maghrib: "miss", isya: "miss" },
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

// --- Scoring ---
export interface ScoreBreakdown {
  sholat: number;
  tilawah: number;
  tahfidz: number;
  qiyam: number;
  puasa: number;
  adab: number;
  total: number;
}

export function scoreEntry(e: IbadahEntry): ScoreBreakdown {
  // Sholat 30 pts
  const sholatPts = Object.values(e.sholat).reduce((acc, s) => {
    if (s === "ontime") return acc + 6;
    if (s === "late") return acc + 2;
    return acc;
  }, 0);
  // Tilawah 15
  const tilawah = e.tilawahHalaman >= 1 ? 15 : e.tilawahMenit > 0 ? 5 : 0;
  // Tahfidz 15
  const tahfidz = e.tahfidzBaru >= 1 ? 15 : e.tahfidzMurajaah >= 1 ? 10 : 0;
  // Qiyam 15
  const qiyam = e.qiyamRakaat >= 2 ? 15 : e.qiyamRakaat === 1 ? 8 : 0;
  // Puasa 10
  const puasa = e.puasa ? 10 : 0;
  // Adab 15
  const adabMap: Record<number, number> = { 1: 3, 2: 6, 3: 9, 4: 12, 5: 15 };
  const adab = adabMap[e.adab] ?? 0;
  const total = sholatPts + tilawah + tahfidz + qiyam + puasa + adab;
  return { sholat: sholatPts, tilawah, tahfidz, qiyam, puasa, adab, total };
}

export function statusOf(score: number): { label: string; tone: "success" | "warning" | "danger" } {
  if (score >= 80) return { label: "Rajin", tone: "success" };
  if (score >= 60) return { label: "Cukup", tone: "warning" };
  return { label: "Perlu Pembinaan", tone: "danger" };
}

export function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export function lastNDates(n: number): string[] {
  const out: string[] = [];
  const t = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(t);
    d.setDate(t.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}