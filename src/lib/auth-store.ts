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

interface SheetsApiResponse {
  success: boolean;
  configured?: boolean;
  message?: string;
  data?: unknown;
}

const SESSION_STORAGE_KEY = "auth-session-v1";
const ACCOUNT_STORAGE_KEY = "auth-accounts-v1";
const SHEETS_API_PATH = "/api/sheets";

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
let accountsHydrationStarted = false;
let demoSeedStarted = false;
const listeners = new Set<() => void>();

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function isAuthAccount(value: unknown): value is AuthAccount {
  if (!value || typeof value !== "object") return false;

  const account = value as Record<string, unknown>;
  const session = account.session as Record<string, unknown> | undefined;

  return (
    typeof account.username === "string" &&
    typeof account.password === "string" &&
    !!session &&
    typeof session.username === "string" &&
    typeof session.role === "string" &&
    typeof session.displayName === "string"
  );
}

function normalizeRemoteAccounts(input: unknown): AuthAccount[] {
  const rows = Array.isArray(input)
    ? input
    : input && typeof input === "object" && Array.isArray((input as { users?: unknown[] }).users)
      ? ((input as { users: unknown[] }).users ?? [])
      : [];

  return rows.reduce<AuthAccount[]>((accounts, row) => {
    if (!row || typeof row !== "object") return accounts;

    const record = row as Record<string, unknown>;
    const username = normalizeUsername(String(record.username ?? ""));
    const password = String(record.password ?? "").trim();
    const displayName = String(record.displayName ?? "");
    const role = String(record.role ?? "");
    const santriId = record.santriId ? String(record.santriId) : undefined;

    if (!username || !password || !displayName || !isKnownUserRole(role)) {
      return accounts;
    }

    accounts.push({
      username,
      password,
      session: {
        username,
        role,
        displayName,
        santriId,
      },
    });

    return accounts;
  }, []);
}

function readAccounts() {
  if (typeof window === "undefined") return DEMO_ACCOUNTS;

  try {
    const raw = localStorage.getItem(ACCOUNT_STORAGE_KEY);
    if (!raw) return DEMO_ACCOUNTS;
    const parsed = JSON.parse(raw) as unknown[];
    const accounts = parsed.filter(isAuthAccount);
    return accounts.length ? accounts : DEMO_ACCOUNTS;
  } catch {
    return DEMO_ACCOUNTS;
  }
}

function persistAccounts(accounts: AuthAccount[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(accounts));
}

function isKnownUserRole(role: string): role is UserRole {
  return role === "musyrif" || role === "musyrifah" || role === "santri" || role === "santriwati";
}

async function postSheetsAction(action: "getUsers" | "upsertUser", payload: unknown) {
  try {
    const response = await fetch(SHEETS_API_PATH, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, payload }),
    });

    return (await response.json()) as SheetsApiResponse;
  } catch (error) {
    console.error("Google Sheets auth sync failed:", error);
    return null;
  }
}

async function upsertUserToSheets(account: AuthAccount) {
  const response = await postSheetsAction("upsertUser", {
    username: account.username,
    password: account.password,
    displayName: account.session.displayName,
    role: account.session.role,
    santriId: account.session.santriId ?? "",
  });

  if (!response) {
    return {
      ok: false as const,
      message: "Tidak dapat menghubungi database akun.",
    };
  }

  if (!response.success) {
    return {
      ok: false as const,
      message: response.message || "Gagal menyimpan akun ke Google Sheet.",
      configured: response.configured,
    };
  }

  return { ok: true as const };
}

async function fetchRemoteAccounts() {
  const response = await postSheetsAction("getUsers", {});

  if (!response) {
    return {
      ok: false as const,
      message: "Tidak dapat menghubungi database akun.",
      configured: true,
      accounts: [] as AuthAccount[],
    };
  }

  if (response.configured === false) {
    return {
      ok: true as const,
      message: response.message,
      configured: false,
      accounts: readAccounts(),
    };
  }

  if (!response.success) {
    return {
      ok: false as const,
      message: response.message || "Gagal membaca database akun dari Google Sheet.",
      configured: true,
      accounts: [] as AuthAccount[],
    };
  }

  return {
    ok: true as const,
    configured: true,
    accounts: normalizeRemoteAccounts(response.data),
  };
}

async function seedDemoAccountsToSheets() {
  if (demoSeedStarted) return { ok: true as const };

  demoSeedStarted = true;
  for (const account of DEMO_ACCOUNTS) {
    const result = await upsertUserToSheets(account);
    if (!result.ok) {
      demoSeedStarted = false;
      return result;
    }
  }

  return { ok: true as const };
}

async function loadAccountsFromSource() {
  const remote = await fetchRemoteAccounts();

  if (!remote.ok) return remote;

  if (!remote.configured) {
    persistAccounts(remote.accounts);
    return remote;
  }

  if (remote.accounts.length > 0) {
    persistAccounts(remote.accounts);
    return remote;
  }

  const seedResult = await seedDemoAccountsToSheets();
  if (!seedResult.ok) {
    return {
      ok: false as const,
      message: seedResult.message,
      configured: seedResult.configured !== false,
      accounts: [] as AuthAccount[],
    };
  }

  const seededRemote = await fetchRemoteAccounts();
  if (!seededRemote.ok) return seededRemote;

  persistAccounts(seededRemote.accounts);
  return seededRemote;
}

async function hydrateAccountsFromSheets() {
  if (accountsHydrationStarted || typeof window === "undefined") return;
  accountsHydrationStarted = true;

  const result = await loadAccountsFromSource();
  if (result.ok) {
    persistAccounts(result.accounts);
  }
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
  } catch {
    session = null;
  }

  syncRoleState(session);
  return { isReady: true, session };
}

function ensureInit() {
  if (!initialized && typeof window !== "undefined") {
    state = loadState();
    initialized = true;
    void hydrateAccountsFromSheets();
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

export async function login(username: string, password: string) {
  ensureInit();

  const normalizedUsername = normalizeUsername(username);
  const source = await loadAccountsFromSource();

  if (!source.ok) {
    return {
      ok: false as const,
      message: source.message,
    };
  }

  const account = source.accounts.find((item) => item.username === normalizedUsername);

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

export async function registerAccount(input: {
  role: UserRole;
  username: string;
  password: string;
  displayName?: string;
  kelas?: string;
  asrama?: string;
}) {
  ensureInit();

  const username = normalizeUsername(input.username);
  const password = input.password.trim();
  const source = await loadAccountsFromSource();

  if (!source.ok) {
    return { ok: false as const, message: source.message };
  }

  if (!username) {
    return { ok: false as const, message: "Username wajib diisi." };
  }

  if (source.accounts.some((item) => item.username === username)) {
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

    if (!input.asrama?.trim()) {
      return { ok: false as const, message: "Asrama wajib diisi." };
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
      asrama: input.asrama.trim(),
    });

    session.displayName = santri.nama;
    session.santriId = santri.id;
  }

  const account: AuthAccount = {
    username,
    password,
    session,
  };

  const syncResult = await upsertUserToSheets(account);
  if (!syncResult.ok) {
    return {
      ok: false as const,
      message: syncResult.message,
    };
  }

  persistAccounts([...source.accounts, account]);

  state = {
    isReady: true,
    session: { ...session },
  };
  persistSession(state.session);
  syncRoleState(state.session);
  emit();

  return { ok: true as const };
}

export async function updateAccount(
  currentUsername: string,
  input: {
    username?: string;
    password?: string;
  },
) {
  ensureInit();

  const source = await loadAccountsFromSource();
  if (!source.ok) {
    return { ok: false as const, message: source.message };
  }

  const index = source.accounts.findIndex((acc) => acc.username === currentUsername);
  if (index === -1) {
    return { ok: false as const, message: "Akun tidak ditemukan." };
  }

  let nextUsername = currentUsername;
  if (input.username && input.username !== currentUsername) {
    const normalizedNew = normalizeUsername(input.username);
    if (source.accounts.some((acc) => acc.username === normalizedNew)) {
      return { ok: false as const, message: "Username sudah digunakan." };
    }
    nextUsername = normalizedNew;
  }

  const account = source.accounts[index];
  if (input.password && input.password.length < 6) {
    return { ok: false as const, message: "Password minimal 6 karakter." };
  }

  const updatedAccount: AuthAccount = {
    ...account,
    username: nextUsername,
    password: input.password ? input.password.trim() : account.password,
    session: {
      ...account.session,
      username: nextUsername,
    },
  };

  source.accounts[index] = updatedAccount;

  const saveResult = await upsertUserToSheets(updatedAccount);
  if (!saveResult.ok) {
    return {
      ok: false as const,
      message: "Gagal menyimpan perubahan ke server. " + saveResult.message,
    };
  }

  if (state.session?.username === currentUsername) {
    state = {
      ...state,
      session: {
        ...state.session,
        username: nextUsername,
      },
    };
    persistSession(state.session);
    emit();
  }

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
