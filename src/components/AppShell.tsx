import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import {
  BarChart3,
  Flame,
  LayoutDashboard,
  LogOut,
  Moon,
  PencilLine,
  Trophy,
  Users,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { logout, type UserRole, useAuth } from "@/lib/auth-store";
import { setActiveSantri, useStore } from "@/lib/ibadah-store";
import { cn } from "@/lib/utils";

const nav = [
  {
    to: "/",
    label: "Dashboard",
    mobileLabel: "Dashboard",
    icon: LayoutDashboard,
    roles: ["musyrif", "santri"] as UserRole[],
  },
  {
    to: "/input",
    label: "Input Ibadah",
    mobileLabel: "Input",
    icon: PencilLine,
    roles: ["santri"] as UserRole[],
  },
  {
    to: "/rekap",
    label: "Rekap",
    mobileLabel: "Rekap",
    icon: BarChart3,
    roles: ["musyrif", "santri"] as UserRole[],
  },
  {
    to: "/ranking",
    label: "Ranking",
    mobileLabel: "Ranking",
    icon: Trophy,
    roles: ["musyrif"] as UserRole[],
  },
  {
    to: "/santri",
    label: "Daftar Santri",
    mobileLabel: "Santri",
    icon: Users,
    roles: ["musyrif"] as UserRole[],
  },
  {
    to: "/butuh-pembinaan",
    label: "Butuh Pembinaan",
    mobileLabel: "Pembinaan",
    icon: Flame,
    roles: ["musyrif"] as UserRole[],
  },
];

export function AppShell() {
  const location = useLocation();
  const { session } = useAuth();
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const santri = useStore((store) => store.santri);
  const activeId = useStore((store) => store.activeSantriId);
  const active = santri.find((item) => item.id === activeId);

  if (!session) return null;

  const visibleNav = nav.filter((item) => item.roles.includes(session.role));
  const canSwitchSantri = session.role === "musyrif";
  const handleLogout = () => logout();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-card lg:block">
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Moon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">Rekap Ibadah</div>
            <div className="text-xs text-muted-foreground">Santri Tracker</div>
          </div>
        </div>

        <nav className="space-y-1 p-3">
          {visibleNav.map((item) => {
            const isActive =
              item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
            const Icon = item.icon;

            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-4 left-3 right-3">
          <div className="space-y-3 rounded-xl border border-border bg-secondary/50 p-3">
            <div>
              <div className="text-xs text-muted-foreground">Login sebagai</div>
              <div className="mt-1 text-sm font-semibold">{session.displayName}</div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {session.role}
              </div>
            </div>

            {canSwitchSantri ? (
              <div>
                <div className="text-xs text-muted-foreground">Santri aktif</div>
                <select
                  value={activeId}
                  onChange={(event) => setActiveSantri(event.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm font-medium"
                >
                  {santri.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nama}
                    </option>
                  ))}
                </select>
                {active ? (
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {active.kelas} - {active.asrama}
                  </div>
                ) : null}
              </div>
            ) : active ? (
              <div className="rounded-lg border border-border bg-background px-3 py-2">
                <div className="text-xs font-medium">{active.nama}</div>
                <div className="text-[11px] text-muted-foreground">
                  {active.kelas} - {active.asrama}
                </div>
              </div>
            ) : null}

            <button
              onClick={() => setIsLogoutOpen(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-accent"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Moon className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold">Rekap Ibadah</span>
        </div>

        <div className="flex items-center gap-2">
          {canSwitchSantri ? (
            <select
              value={activeId}
              onChange={(event) => setActiveSantri(event.target.value)}
              className="rounded-md border border-input bg-background px-2 py-1 text-xs"
            >
              {santri.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nama}
                </option>
              ))}
            </select>
          ) : (
            <span className="max-w-28 truncate text-xs text-muted-foreground">{active?.nama}</span>
          )}

          <button
            onClick={() => setIsLogoutOpen(true)}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium"
          >
            Keluar
          </button>
        </div>
      </header>

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>

        <nav
          className="fixed inset-x-0 bottom-0 z-20 grid border-t border-border bg-card lg:hidden"
          style={{ gridTemplateColumns: `repeat(${visibleNav.length}, minmax(0, 1fr))` }}
        >
          {visibleNav.map((item) => {
            const isActive =
              item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
            const Icon = item.icon;

            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[10px]",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.mobileLabel}
              </Link>
            );
          })}
        </nav>
        <div className="h-16 lg:hidden" />
      </main>

      <AlertDialog open={isLogoutOpen} onOpenChange={setIsLogoutOpen}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Keluar dari akun?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan keluar dari sesi saat ini dan perlu login lagi untuk mengakses dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-primary text-primary-foreground hover:opacity-90"
            >
              Ya, keluar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
