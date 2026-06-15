import { FormEvent, useState } from "react";
import { Navigate, createFileRoute } from "@tanstack/react-router";
import { LockKeyhole, Moon, ShieldCheck, UserPlus2 } from "lucide-react";
import {
  isStudentRole,
  login,
  registerAccount,
  roleLabel,
  type UserRole,
  useAuth,
} from "@/lib/auth-store";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [{ title: "Login - Rekap Ibadah Santri" }],
  }),
});

function LoginPage() {
  const { isReady, session } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const kelasOptions = ["X", "XI", "XII"] as const;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [registerRole, setRegisterRole] = useState<UserRole>("musyrif");
  const [registerName, setRegisterName] = useState("");
  const [registerKelas, setRegisterKelas] = useState<(typeof kelasOptions)[number]>("X");
  const [registerAsrama, setRegisterAsrama] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const roleOptions: UserRole[] = ["musyrif", "musyrifah", "santri", "santriwati"];
  const needsSantriProfile = isStudentRole(registerRole);

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <div className="text-base font-semibold">Menyiapkan halaman login...</div>
          <div className="mt-2 text-sm text-muted-foreground">Membaca sesi lokal aplikasi.</div>
        </div>
      </div>
    );
  }

  if (session) {
    return <Navigate to="/" />;
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoggingIn(true);
    const result = await login(username.trim(), password);
    setIsLoggingIn(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setError("");
  };

  const onRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (registerPassword !== confirmPassword) {
      setRegisterError("Konfirmasi password belum sama.");
      return;
    }

    setIsRegistering(true);
    const result = await registerAccount({
      role: registerRole,
      displayName: registerName,
      kelas: needsSantriProfile ? registerKelas : undefined,
      asrama: needsSantriProfile ? registerAsrama : undefined,
      username: registerUsername,
      password: registerPassword,
    });
    setIsRegistering(false);

    if (!result.ok) {
      setRegisterError(result.message);
      return;
    }

    setRegisterError("");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,oklch(0.96_0.04_165),transparent_45%),linear-gradient(180deg,oklch(0.99_0.01_165),oklch(0.96_0.02_165))] px-4 py-10 text-foreground">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="order-2 space-y-6 lg:order-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium shadow-sm backdrop-blur">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Sistem monitoring ibadah santri
          </div>
          <div className="space-y-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-primary-foreground shadow-lg"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Moon className="h-7 w-7" />
            </div>
            <div>
              <h1 className="max-w-xl text-4xl font-bold tracking-tight sm:text-5xl">
                Selamat Datang
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Sistem Monitoring Ibadah Santri
              </p>
            </div>
          </div>
        </section>

        <section className="order-1 rounded-[2rem] border border-border bg-card p-6 shadow-[0_24px_80px_oklch(0.68_0.15_165_/_0.15)] sm:p-8 lg:order-2">
          <div className="mb-6 flex gap-2 rounded-2xl border border-border bg-secondary/60 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setRegisterError("");
              }}
              className={
                "flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-colors " +
                (mode === "login"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError("");
              }}
              className={
                "flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-colors " +
                (mode === "register"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              Daftar
            </button>
          </div>

          {mode === "login" ? (
            <>
              <div className="mb-6">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-primary">
                  <LockKeyhole className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-2xl font-bold tracking-tight">Login</h2>
              </div>

              <form className="space-y-4" onSubmit={onSubmit}>
                <label className="block">
                  <span className="text-sm font-medium">Username</span>
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="musyrif atau santriwati"
                    className="mt-2 w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium">Password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="jadibaik"
                    className="mt-2 w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                {error ? (
                  <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {isLoggingIn ? "Memeriksa akun..." : "Login"}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-6">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-primary">
                  <UserPlus2 className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-2xl font-bold tracking-tight">Daftar Akun</h2>
              </div>

              <form className="space-y-4" onSubmit={onRegister}>
                <label className="block">
                  <span className="text-sm font-medium">Role</span>
                  <select
                    value={registerRole}
                    onChange={(event) => setRegisterRole(event.target.value as UserRole)}
                    className="mt-2 w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {roleLabel(role)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium">Masukan Nama Lengkap</span>
                  <input
                    value={registerName}
                    onChange={(event) => setRegisterName(event.target.value)}
                    placeholder={needsSantriProfile ? "Nama santri / santriwati" : "Nama pembina"}
                    className="mt-2 w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  {needsSantriProfile ? (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Profil akan dibuat otomatis dan masuk ke binaan{" "}
                      {registerRole === "santri" ? "musyrif" : "musyrifah"}.
                    </div>
                  ) : null}
                </label>

                {needsSantriProfile ? (
                  <>
                    <label className="block">
                      <span className="text-sm font-medium">Kelas</span>
                      <select
                        value={registerKelas}
                        onChange={(event) =>
                          setRegisterKelas(event.target.value as (typeof kelasOptions)[number])
                        }
                        className="mt-2 w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      >
                        {kelasOptions.map((kelas) => (
                          <option key={kelas} value={kelas}>
                            {kelas}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium">Asrama</span>
                      <input
                        type="text"
                        value={registerAsrama}
                        onChange={(event) => setRegisterAsrama(event.target.value)}
                        placeholder="Nama asrama (misal: Alfatihah Pusat)"
                        className="mt-2 w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </label>
                  </>
                ) : null}

                <label className="block">
                  <span className="text-sm font-medium">Username</span>
                  <input
                    value={registerUsername}
                    onChange={(event) => setRegisterUsername(event.target.value)}
                    placeholder="username unik"
                    className="mt-2 w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium">Password</span>
                  <input
                    type="password"
                    value={registerPassword}
                    onChange={(event) => setRegisterPassword(event.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="mt-2 w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium">Konfirmasi password</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Ulangi password"
                    className="mt-2 w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                {registerError ? (
                  <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
                    {registerError}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isRegistering}
                  className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {isRegistering ? "Menyimpan akun..." : "Buat Akun"}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
