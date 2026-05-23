import { useSyncExternalStore } from "react";
import { setActiveSantri } from "@/lib/ibadah-store";

export type UserRole = "musyrif" | "santri";

export interface AuthSession {
  username: string;
  role: UserRole;
  displayName: string;
  santriId?: string;
}

interface AuthState {
  isReady: boolean;
  session: AuthSession | null;
}

const STORAGE_KEY = "auth-session-v1";

const DEMO_ACCOUNTS = {
  musyrif: {
    password: "jadibaik",
    session: {
      username: "musyrif",
      role: "musyrif",
      displayName: "Musyrif Asrama",
    } satisfies AuthSession,
  },
  santri: {
    password: "jadibaik",
    session: {
      username: "santri",
      role: "santri",
      displayName: "Ahmad Faiz Rahman",
      santriId: "s1",
    } satisfies AuthSession,
  },
} as const;

let state: AuthState = { isReady: false, session: null };
let initialized = false;
const listeners = new Set<() => void>();

function syncRoleState(session: AuthSession | null) {
  if (session?.role === "santri" && session.santriId) {
    setActiveSantri(session.santriId);
  }
}

function loadState(): AuthState {
  if (typeof window === "undefined") {
    return { isReady: false, session: null };
  }

  let session: AuthSession | null = null;

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
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

function persist(session: AuthSession | null) {
  if (typeof window === "undefined") return;

  if (session) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    sessionStorage.removeItem(STORAGE_KEY);
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

  const account = DEMO_ACCOUNTS[username as keyof typeof DEMO_ACCOUNTS];
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
  persist(state.session);
  syncRoleState(state.session);
  emit();

  return { ok: true as const };
}

export function logout() {
  ensureInit();
  state = { isReady: true, session: null };
  persist(null);
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
    access: "Dashboard semua santri, rekap, ranking, daftar santri",
  },
  {
    role: "Santri",
    username: "santri",
    password: "jadibaik",
    access: "Dashboard pribadi, rekap pribadi, dan input ibadah",
  },
] as const;
