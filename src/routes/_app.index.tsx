import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  useStore,
  todayString,
  getEntry,
  scoreEntry,
  statusOf,
  lastNDates,
  emptyEntry,
  SHOLAT_KEYS,
} from "@/lib/ibadah-store";
import {
  Flame,
  CheckCircle2,
  Clock,
  BookOpen,
  GraduationCap,
  Moon,
  Star,
  TrendingUp,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Dashboard — Rekap Ibadah Santri" },
      { name: "description", content: "Ringkasan ibadah harian santri." },
    ],
  }),
});

function Dashboard() {
  const activeId = useStore((s) => s.activeSantriId);
  const santri = useStore((s) => s.santri.find((x) => x.id === activeId));
  const entries = useStore((s) => s.entries);

  const today = todayString();
  const todayEntry = useMemo(
    () => getEntry(today, activeId) ?? emptyEntry(today, activeId),
    [entries, today, activeId]
  );
  const score = scoreEntry(todayEntry);
  const st = statusOf(score.total);

  const trend = useMemo(
    () =>
      lastNDates(14).map((d) => {
        const e = entries.find((x) => x.date === d && x.santriId === activeId);
        return { date: d.slice(5), score: e ? scoreEntry(e).total : 0 };
      }),
    [entries, activeId]
  );

  const streak = useMemo(() => {
    let s = 0;
    const dates = lastNDates(60).reverse();
    for (const d of dates) {
      const e = entries.find((x) => x.date === d && x.santriId === activeId);
      if (e && scoreEntry(e).total >= 80) s++;
      else break;
    }
    return s;
  }, [entries, activeId]);

  const sholatPct = useMemo(() => {
    const last30 = lastNDates(30);
    let total = 0,
      ontime = 0;
    last30.forEach((d) => {
      const e = entries.find((x) => x.date === d && x.santriId === activeId);
      if (!e) return;
      SHOLAT_KEYS.forEach((k) => {
        total++;
        if (e.sholat[k] === "ontime") ontime++;
      });
    });
    return total ? Math.round((ontime / total) * 100) : 0;
  }, [entries, activeId]);

  const totalTilawah = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7);
    return entries
      .filter((e) => e.santriId === activeId && e.date.startsWith(month))
      .reduce((acc, e) => acc + e.tilawahMenit, 0);
  }, [entries, activeId]);

  const avgScore = Math.round(
    trend.reduce((a, t) => a + t.score, 0) /
      Math.max(1, trend.filter((t) => t.score).length)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Assalamu'alaikum, {santri?.nama.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <Link
          to="/input"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <CheckCircle2 className="h-4 w-4" /> Input Hari Ini
        </Link>
      </div>

      <div
        className="relative overflow-hidden rounded-2xl p-6 text-primary-foreground"
        style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
      >
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="text-xs uppercase tracking-wider opacity-80">Skor Hari Ini</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-6xl font-bold tabular-nums">{score.total}</span>
              <span className="text-xl opacity-80">/100</span>
            </div>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-sm font-medium backdrop-blur">
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  background:
                    st.tone === "success" ? "#86efac" : st.tone === "warning" ? "#fde047" : "#fca5a5",
                }}
              />
              {st.label}
            </div>
          </div>
          <div className="h-32 w-full sm:w-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="score" stroke="#ffffff" strokeWidth={2} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={<Clock className="h-4 w-4" />} label="Sholat On-Time 30hr" value={`${sholatPct}%`} />
        <StatCard icon={<BookOpen className="h-4 w-4" />} label="Tilawah Bulan Ini" value={`${totalTilawah} mnt`} />
        <StatCard icon={<Flame className="h-4 w-4" />} label="Streak Rajin" value={`${streak} hari`} />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Rata² Skor 14hr" value={`${avgScore || 0}`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Tren Skor 14 Hari</h3>
            <span className="text-xs text-muted-foreground">0 – 100</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.02 170)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="oklch(0.55 0.18 165)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold mb-4">Breakdown Hari Ini</h3>
          <div className="space-y-3">
            <Prog label="Sholat 5 Waktu" icon={<Moon className="h-3.5 w-3.5" />} value={score.sholat} max={30} />
            <Prog label="Tilawah" icon={<BookOpen className="h-3.5 w-3.5" />} value={score.tilawah} max={15} />
            <Prog label="Tahfidz" icon={<GraduationCap className="h-3.5 w-3.5" />} value={score.tahfidz} max={15} />
            <Prog label="Qiyamul Lail" icon={<Moon className="h-3.5 w-3.5" />} value={score.qiyam} max={15} />
            <Prog label="Puasa Sunnah" icon={<Flame className="h-3.5 w-3.5" />} value={score.puasa} max={10} />
            <Prog label="Adab & Disiplin" icon={<Star className="h-3.5 w-3.5" />} value={score.adab} max={15} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function Prog({ label, icon, value, max }: { label: string; icon: React.ReactNode; value: number; max: number }) {
  const pct = Math.round((value / max) * 100);
  const tone = pct >= 80 ? "var(--success)" : pct >= 50 ? "var(--warning)" : "var(--danger)";
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="flex items-center gap-1.5 font-medium">
          {icon}
          {label}
        </span>
        <span className="tabular-nums text-muted-foreground">
          {value}/{max}
        </span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: tone }} />
      </div>
    </div>
  );
}