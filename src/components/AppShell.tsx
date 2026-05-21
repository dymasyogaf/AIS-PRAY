import { Link, Outlet, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  PencilLine,
  BarChart3,
  Trophy,
  Users,
  Moon,
} from "lucide-react";
import { useStore, setActiveSantri } from "@/lib/ibadah-store";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/input", label: "Input Ibadah", icon: PencilLine },
  { to: "/rekap", label: "Rekap & Grafik", icon: BarChart3 },
  { to: "/ranking", label: "Ranking", icon: Trophy },
  { to: "/santri", label: "Daftar Santri", icon: Users },
];

export function AppShell() {
  const location = useLocation();
  const santri = useStore((s) => s.santri);
  const activeId = useStore((s) => s.activeSantriId);
  const active = santri.find((s) => s.id === activeId);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-card lg:block">
        <div className="flex h-16 items-center gap-2 px-6 border-b border-border">
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
        <nav className="p-3 space-y-1">
          {nav.map((n) => {
            const Active =
              n.to === "/" ? location.pathname === "/" : location.pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  Active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-4 left-3 right-3">
          <div className="rounded-xl border border-border bg-secondary/50 p-3">
            <div className="text-xs text-muted-foreground">Santri aktif</div>
            <select
              value={activeId}
              onChange={(e) => setActiveSantri(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm font-medium"
            >
              {santri.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama}
                </option>
              ))}
            </select>
            {active && (
              <div className="mt-1 text-[11px] text-muted-foreground">
                {active.kelas} • {active.asrama}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
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
        <select
          value={activeId}
          onChange={(e) => setActiveSantri(e.target.value)}
          className="rounded-md border border-input bg-background px-2 py-1 text-xs"
        >
          {santri.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nama}
            </option>
          ))}
        </select>
      </header>

      <main className="lg:pl-64">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
        <nav className="fixed bottom-0 inset-x-0 z-20 grid grid-cols-5 border-t border-border bg-card lg:hidden">
          {nav.map((n) => {
            const Active =
              n.to === "/" ? location.pathname === "/" : location.pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[10px]",
                  Active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {n.label.split(" ")[0]}
              </Link>
            );
          })}
        </nav>
        <div className="h-16 lg:hidden" />
      </main>
    </div>
  );
}