import { useSyncExternalStore } from "react";
import {
  createDummySantriProfile,
  getActiveSantriIdValue,
  getSantriList,
  setActiveSantri,
  type SantriGender,
  type SupervisorRole,
} from "@/lib/ibadah-store";

export type UserRole = "musyrif" | "musyrifah" | "santri" | "santriwati";

export interface AuthSession {
  username: string;
  role: UserRole;
  displayName: string;
  santriId?: string;
}

interface AuthAccount {
  username: string;
  password: string;
  session: AuthSession;
}

interface AuthState {
  isReady: boolean;
  session: AuthSession | null;
}

const SESSION_STORAGE_KEY = "auth-session-v1";
const ACCOUNT_STORAGE_KEY = "auth-accounts-v1";

const DEMO_ACCOUNTS: AuthAccount[] = [
  {
    username: "musyrif",
    password: "jadibaik",
    session: {
      username: "musyrif",
      role: "musyrif",
      displayName: "Musyrif Putra",
    },
  },
  {
    username: "musyrifah",
    password: "jadibaik",
    session: {
      username: "musyrifah",
      role: "musyrifah",
      displayName: "Musyrifah Putri",
    },
  },
  {
    username: "santri",
    password: "jadibaik",
    session: {
      username: "santri",
      role: "santri",
      displayName: "Ahmad Faiz Rahman",
      santriId: "s1",
    },
  },
  {
    username: "santriwati",
    password: "jadibaik",
    session: {
      username: "santriwati",
      role: "santriwati",
      displayName: "Aisyah Zahra",
      santriId: "s5",
    },
  },
];

let state: AuthState = { isReady: false, session: null };
let initialized = false;
const listeners = new Set<() => void>();

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function readAccounts() {
  if (typeof window === "undefined") return DEMO_ACCOUNTS;

  try {
    const raw = localStorage.getItem(ACCOUNT_STORAGE_KEY);
    if (!raw) return DEMO_ACCOUNTS;
    const parsed = JSON.parse(raw) as AuthAccount[];
    return parsed.length ? parsed : DEMO_ACCOUNTS;
  } catch {
    return DEMO_ACCOUNTS;
  }
}

function persistAccounts(accounts: AuthAccount[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(accounts));
}

export function roleLabel(role: UserRole) {
  return {
    musyrif: "Musyrif",
    musyrifah: "Musyrifah",
    santri: "Santri",
    santriwati: "Santriwati",
  }[role];
}

export function isSupervisorRole(role: UserRole) {
  return role === "musyrif" || role === "musyrifah";
}

export function isStudentRole(role: UserRole) {
  return role === "santri" || role === "santriwati";
}

export function genderForRole(role: UserRole): SantriGender {
  return role === "musyrif" || role === "santri" ? "putra" : "putri";
}

export function filterSantriForRole<
  T extends { gender: SantriGender; supervisorRole?: SupervisorRole },
>(role: UserRole, santri: T[]) {
  return santri.filter((item) => {
    if ("supervisorRole" in item && isSupervisorRole(role)) {
      return item.supervisorRole === role;
    }

    return item.gender === genderForRole(role);
  });
}

export function supervisorRoleForStudentRole(role: UserRole): SupervisorRole {
  return role === "santri" ? "musyrif" : "musyrifah";
}

function syncRoleState(session: AuthSession | null) {
  if (!session) return;

  if (isStudentRole(session.role) && session.santriId) {
    setActiveSantri(session.santriId);
    return;
  }

  const accessibleSantri = filterSantriForRole(session.role, getSantriList());
  const activeSantriId = getActiveSantriIdValue();

  if (accessibleSantri.some((item) => item.id === activeSantriId)) return;
  if (accessibleSantri[0]) {
    setActiveSantri(accessibleSantri[0].id);
  }
}

function loadState(): AuthState {
  if (typeof window === "undefined") {
    return { isReady: false, session: null };
  }

  let session: AuthSession | null = null;

  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      session = JSON.parse(raw) as AuthSession;
    }
  } catch {}

  syncRoleState(session);
  return { isReady: true, session };
}

function ensureInit() {
  if (!initialized && typeof window !== "undefined") {
    state = loadState();
    initialized = true;
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  ensureInit();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function persistSession(session: AuthSession | null) {
  if (typeof window === "undefined") return;

  if (session) {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } else {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

export function useAuth() {
  ensureInit();
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => ({ isReady: false, session: null }),
  );
}

export function login(username: string, password: string) {
  ensureInit();

  const normalizedUsername = normalizeUsername(username);
  const account = readAccounts().find((item) => item.username === normalizedUsername);

  if (!account || account.password !== password) {
    return {
      ok: false as const,
      message: "Username atau password tidak valid.",
    };
  }

  state = {
    isReady: true,
    session: { ...account.session },
  };
  persistSession(state.session);
  syncRoleState(state.session);
  emit();

  return { ok: true as const };
}

export function registerAccount(input: {
  role: UserRole;
  username: string;
  password: string;
  displayName?: string;
  kelas?: string;
}) {
  ensureInit();

  const username = normalizeUsername(input.username);
  const password = input.password.trim();
  const accounts = readAccounts();

  if (!username) {
    return { ok: false as const, message: "Username wajib diisi." };
  }

  if (accounts.some((item) => item.username === username)) {
    return { ok: false as const, message: "Username sudah digunakan." };
  }

  if (password.length < 6) {
    return { ok: false as const, message: "Password minimal 6 karakter." };
  }

  const displayName = input.displayName?.trim();
  if (!displayName) {
    return { ok: false as const, message: "Nama lengkap wajib diisi." };
  }

  const session: AuthSession = {
    username,
    role: input.role,
    displayName,
  };

  if (isStudentRole(input.role)) {
    if (!input.kelas) {
      return { ok: false as const, message: "Kelas wajib dipilih." };
    }

    const existingProfile = filterSantriForRole(input.role, getSantriList()).find(
      (item) => item.nama.trim().toLowerCase() === displayName.toLowerCase(),
    );

    if (existingProfile) {
      return {
        ok: false as const,
        message: "Nama santri ini sudah ada. Gunakan nama lain untuk dummy profile.",
      };
    }

    const santri = createDummySantriProfile({
      nama: displayName,
      gender: genderForRole(input.role),
      supervisorRole: supervisorRoleForStudentRole(input.role),
      kelas: input.kelas,
    });

    session.displayName = santri.nama;
    session.santriId = santri.id;
  }

  const account: AuthAccount = {
    username,
    password,
    session,
  };

  persistAccounts([...accounts, account]);

  state = {
    isReady: true,
    session: { ...session },
  };
  persistSession(state.session);
  syncRoleState(state.session);
  emit();

  return { ok: true as const };
}

export function logout() {
  ensureInit();
  state = { isReady: true, session: null };
  persistSession(null);
  emit();
}

export function canAccessRole(role: UserRole, allowedRoles: UserRole[]) {
  return allowedRoles.includes(role);
}

export const authDemoAccounts = [
  {
    role: "Musyrif",
    username: "musyrif",
    password: "jadibaik",
    access: "Dashboard putra, rekap, ranking, daftar santri putra",
  },
  {
    role: "Musyrifah",
    username: "musyrifah",
    password: "jadibaik",
    access: "Dashboard putri, rekap, ranking, daftar santriwati",
  },
  {
    role: "Santri",
    username: "santri",
    password: "jadibaik",
    access: "Dashboard pribadi putra, rekap pribadi, dan input ibadah",
  },
  {
    role: "Santriwati",
    username: "santriwati",
    password: "jadibaik",
    access: "Dashboard pribadi putri, rekap pribadi, dan input ibadah",
  },
] as const;
