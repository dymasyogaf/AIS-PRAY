import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Flame,
  GraduationCap,
  Moon,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "@/lib/auth-store";
import {
  SHOLAT_KEYS,
  emptyEntry,
  getEntry,
  lastNDates,
  scoreEntry,
  statusOf,
  todayString,
  useStore,
} from "@/lib/ibadah-store";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Dashboard - Rekap Ibadah Santri" },
      { name: "description", content: "Ringkasan ibadah harian santri." },
    ],
  }),
});

function Dashboard() {
  const { session } = useAuth();

  if (session?.role === "musyrif") {
    return <MusyrifDashboard />;
  }

  return <SantriDashboard />;
}

function SantriDashboard() {
  const activeId = useStore((store) => store.activeSantriId);
  const santri = useStore((store) => store.santri.find((item) => item.id === activeId));
  const entries = useStore((store) => store.entries);

  const today = todayString();
  const todayEntry = useMemo(
    () => getEntry(today, activeId) ?? emptyEntry(today, activeId),
    [activeId, entries, today],
  );

  const activityTrend = useMemo(
    () =>
      lastNDates(14).map((date) => {
        const entry = entries.find((item) => item.date === date && item.santriId === activeId);
        return {
          date: date.slice(5),
          tilawah: entry?.tilawahMenit ?? 0,
          sholat: entry ? SHOLAT_KEYS.filter((key) => entry.sholat[key] === "ontime").length : 0,
        };
      }),
    [activeId, entries],
  );

  const sholatPct = useMemo(() => {
    const last30 = lastNDates(30);
    let total = 0;
    let ontime = 0;

    last30.forEach((date) => {
      const entry = entries.find((item) => item.date === date && item.santriId === activeId);
      if (!entry) return;

      SHOLAT_KEYS.forEach((key) => {
        total += 1;
        if (entry.sholat[key] === "ontime") ontime += 1;
      });
    });

    return total ? Math.round((ontime / total) * 100) : 0;
  }, [activeId, entries]);

  const totalTilawah = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7);
    return entries
      .filter((entry) => entry.santriId === activeId && entry.date.startsWith(month))
      .reduce((total, entry) => total + entry.tilawahMenit, 0);
  }, [activeId, entries]);

  const recordedDays = useMemo(
    () =>
      lastNDates(14).filter((date) =>
        entries.some((item) => item.date === date && item.santriId === activeId),
      ).length,
    [activeId, entries],
  );

  const tahfidzTotal = useMemo(
    () =>
      entries
        .filter((entry) => entry.santriId === activeId)
        .reduce((total, entry) => total + entry.tahfidzBaru + entry.tahfidzMurajaah, 0),
    [activeId, entries],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Assalamu'alaikum, {santri?.nama.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
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
          <CheckCircle2 className="h-4 w-4" />
          Input Hari Ini
        </Link>
      </div>

      <div
        className="relative overflow-hidden rounded-2xl p-6 text-primary-foreground"
        style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
      >
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="text-xs uppercase tracking-wider opacity-80">Aktivitas Hari Ini</div>
            <div className="mt-2 space-y-2 text-sm">
              <div>
                Sholat on-time:{" "}
                {SHOLAT_KEYS.filter((key) => todayEntry.sholat[key] === "ontime").length}/5
              </div>
              <div>Tilawah: {todayEntry.tilawahMenit} menit</div>
              <div>Tahfidz: {todayEntry.tahfidzBaru + todayEntry.tahfidzMurajaah} halaman</div>
              <div>Qiyamul lail: {todayEntry.qiyamRakaat} rakaat</div>
            </div>
          </div>

          <div className="h-32 w-full sm:w-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityTrend}>
                <defs>
                  <linearGradient id="santri-tilawah" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="tilawah"
                  stroke="#ffffff"
                  strokeWidth={2}
                  fill="url(#santri-tilawah)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 sm:gap-4">
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Sholat On-Time 30 Hari"
          value={`${sholatPct}%`}
        />
        <StatCard
          icon={<BookOpen className="h-4 w-4" />}
          label="Tilawah Bulan Ini"
          value={`${totalTilawah} menit`}
        />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Hari Tercatat"
          value={`${recordedDays}/14`}
        />
        <StatCard
          icon={<GraduationCap className="h-4 w-4" />}
          label="Total Tahfidz"
          value={`${tahfidzTotal}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Tren Tilawah 14 Hari</h3>
            <span className="text-xs text-muted-foreground">Menit</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activityTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.02 170)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="tilawah"
                  stroke="oklch(0.55 0.18 165)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 font-semibold">Ringkasan Hari Ini</h3>
          <div className="space-y-3">
            <ActivityRow label="Subuh" value={statusLabel(todayEntry.sholat.subuh)} />
            <ActivityRow label="Dzuhur" value={statusLabel(todayEntry.sholat.dzuhur)} />
            <ActivityRow label="Ashar" value={statusLabel(todayEntry.sholat.ashar)} />
            <ActivityRow label="Maghrib" value={statusLabel(todayEntry.sholat.maghrib)} />
            <ActivityRow label="Isya" value={statusLabel(todayEntry.sholat.isya)} />
            <ActivityRow label="Puasa Sunnah" value={todayEntry.puasa ? "Ya" : "Tidak"} />
            <ActivityRow label="Adab" value={`${todayEntry.adab}/5`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MusyrifDashboard() {
  const santri = useStore((store) => store.santri);
  const entries = useStore((store) => store.entries);
  const today = todayString();

  const todayScores = useMemo(
    () =>
      santri.map((item) => {
        const entry = entries.find((row) => row.date === today && row.santriId === item.id);
        const total = entry ? scoreEntry(entry).total : 0;
        return { ...item, total, status: statusOf(total) };
      }),
    [entries, santri, today],
  );

  const avgToday = Math.round(
    todayScores.reduce((total, item) => total + item.total, 0) / Math.max(1, todayScores.length),
  );
  const rajinCount = todayScores.filter((item) => item.total >= 80).length;
  const pembinaanCount = todayScores.filter((item) => item.total > 0 && item.total < 60).length;
  const inputToday = todayScores.filter((item) => item.total > 0).length;

  const trend = useMemo(
    () =>
      lastNDates(14).map((date) => {
        const scores = santri
          .map((item) => {
            const entry = entries.find((row) => row.date === date && row.santriId === item.id);
            return entry ? scoreEntry(entry).total : null;
          })
          .filter((value): value is number => value !== null);

        const average = scores.length
          ? Math.round(scores.reduce((total, value) => total + value, 0) / scores.length)
          : 0;

        return { date: date.slice(5), score: average };
      }),
    [entries, santri],
  );

  const topSantri = useMemo(() => {
    const dates = new Set(lastNDates(7));
    return santri
      .map((item) => {
        const scores = entries
          .filter((entry) => entry.santriId === item.id && dates.has(entry.date))
          .map((entry) => scoreEntry(entry).total);

        const average = scores.length
          ? Math.round(scores.reduce((total, value) => total + value, 0) / scores.length)
          : 0;

        return { ...item, avg: average };
      })
      .sort((left, right) => right.avg - left.avg)
      .slice(0, 5);
  }, [entries, santri]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard Musyrif</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ringkasan kondisi seluruh santri hari ini.
          </p>
        </div>
      </div>

      <div
        className="overflow-hidden rounded-2xl p-6 text-primary-foreground"
        style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
      >
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="text-xs uppercase tracking-wider opacity-80">Monitoring Hari Ini</div>
            <h2 className="mt-2 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
              Pantau skor ibadah, kedisiplinan, dan santri yang perlu perhatian.
            </h2>
            <p className="mt-3 max-w-2xl text-sm opacity-90">
              Data di bawah mengambil seluruh input santri dan menampilkan rata-rata harian serta
              santri terbaik 7 hari terakhir.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <HeroStat label="Total Santri" value={`${santri.length}`} />
            <HeroStat label="Rata-rata Hari Ini" value={`${avgToday}`} />
            <HeroStat label="Input Masuk" value={`${inputToday}/${santri.length}`} />
            <HeroStat label="Perlu Pembinaan" value={`${pembinaanCount}`} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 sm:gap-4">
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Santri Rajin Hari Ini"
          value={`${rajinCount}`}
        />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Input Hari Ini"
          value={`${inputToday}`}
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Skor Rata-rata"
          value={`${avgToday}`}
        />
        <StatCard
          icon={<Flame className="h-4 w-4" />}
          label="Butuh Pembinaan"
          value={`${pembinaanCount}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Tren Rata-rata 14 Hari</h3>
            <span className="text-xs text-muted-foreground">Semua santri</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.02 170)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="oklch(0.55 0.18 165)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 font-semibold">Top 5 Santri Minggu Ini</h3>
          <div className="space-y-3">
            {topSantri.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3"
              >
                <div>
                  <div className="text-xs text-muted-foreground">#{index + 1}</div>
                  <div className="font-semibold">{item.nama}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.kelas} - {item.asrama}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold tabular-nums">{item.avg}</div>
                  <div className="text-xs text-muted-foreground">rata-rata</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h3 className="font-semibold">Skor Hari Ini per Santri</h3>
          <span className="text-xs text-muted-foreground">{today}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Nama</th>
                <th className="px-3 py-3 text-left">Kelas</th>
                <th className="px-3 py-3 text-left">Asrama</th>
                <th className="px-3 py-3 text-center">Skor</th>
                <th className="px-3 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {todayScores.map((item) => (
                <tr key={item.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{item.nama}</td>
                  <td className="px-3 py-3 text-muted-foreground">{item.kelas}</td>
                  <td className="px-3 py-3 text-muted-foreground">{item.asrama}</td>
                  <td className="px-3 py-3 text-center font-bold tabular-nums">{item.total}</td>
                  <td className="px-3 py-3 text-center">
                    <span
                      className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{
                        backgroundColor: `color-mix(in oklab, var(--${item.status.tone}) 18%, transparent)`,
                        color: `var(--${item.status.tone})`,
                      }}
                    >
                      {item.status.label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function statusLabel(value: string) {
  if (value === "ontime") return "On-time";
  if (value === "late") return "Telat";
  return "Tidak";
}

function ActivityRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/15 px-4 py-4 backdrop-blur">
      <div className="text-xs uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-2 text-3xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
