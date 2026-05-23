import { FormEvent, useState } from "react";
import { Navigate, createFileRoute } from "@tanstack/react-router";
import { LockKeyhole, Moon, ShieldCheck } from "lucide-react";
import { authDemoAccounts, login, useAuth } from "@/lib/auth-store";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [{ title: "Login - Rekap Ibadah Santri" }],
  }),
});

function LoginPage() {
  const { isReady, session } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

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

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = login(username.trim(), password);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setError("");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,oklch(0.96_0.04_165),transparent_45%),linear-gradient(180deg,oklch(0.99_0.01_165),oklch(0.96_0.02_165))] px-4 py-10 text-foreground">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
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
                Login sesuai peran untuk akses data musyrif dan santri.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Musyrif melihat ringkasan seluruh santri. Santri hanya melihat data pribadi dan
                mengisi ibadah harian.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {authDemoAccounts.map((account) => (
              <div
                key={account.username}
                className="rounded-3xl border border-border bg-card/90 p-5 shadow-sm backdrop-blur"
              >
                <div className="text-sm font-semibold">{account.role}</div>
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <div>
                    Username:{" "}
                    <span className="font-medium text-foreground">{account.username}</span>
                  </div>
                  <div>
                    Password:{" "}
                    <span className="font-medium text-foreground">{account.password}</span>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">{account.access}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-[0_24px_80px_oklch(0.68_0.15_165_/_0.15)] sm:p-8">
          <div className="mb-6">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-primary">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight">Masuk ke aplikasi</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Gunakan salah satu akun demo yang tersedia.
            </p>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="block">
              <span className="text-sm font-medium">Username</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="musyrif atau santri"
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
              className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              style={{ background: "var(--gradient-primary)" }}
            >
              Login
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
