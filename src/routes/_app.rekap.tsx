import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore, scoreEntry, statusOf, lastNDates, SHOLAT_KEYS } from "@/lib/ibadah-store";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";

export const Route = createFileRoute("/_app/rekap")({
  component: RekapPage,
  head: () => ({ meta: [{ title: "Rekap & Grafik — Rekap Santri" }] }),
});

function RekapPage() {
  const activeId = useStore((s) => s.activeSantriId);
  const entries = useStore((s) => s.entries);
  const [range, setRange] = useState<7 | 30>(7);

  const dates = lastNDates(range);
  const rows = useMemo(
    () =>
      dates.map((d) => {
        const e = entries.find((x) => x.date === d && x.santriId === activeId);
        const sc = e ? scoreEntry(e) : null;
        return { date: d, entry: e, score: sc };
      }),
    [entries, activeId, range]
  );

  const avg = (key: "sholat" | "tilawah" | "tahfidz" | "qiyam" | "puasa" | "adab") => {
    const vals = rows.filter((r) => r.score).map((r) => r.score![key]);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };

  const radarData = [
    { kategori: "Sholat", nilai: Math.round((avg("sholat") / 30) * 100) },
    { kategori: "Tilawah", nilai: Math.round((avg("tilawah") / 15) * 100) },
    { kategori: "Tahfidz", nilai: Math.round((avg("tahfidz") / 15) * 100) },
    { kategori: "Qiyam", nilai: Math.round((avg("qiyam") / 15) * 100) },
    { kategori: "Puasa", nilai: Math.round((avg("puasa") / 10) * 100) },
    { kategori: "Adab", nilai: Math.round((avg("adab") / 15) * 100) },
  ];

  const barData = rows.map((r) => ({
    date: r.date.slice(5),
    score: r.score?.total ?? 0,
  }));

  const totalSkor = rows.reduce((a, r) => a + (r.score?.total ?? 0), 0);
  const count = rows.filter((r) => r.entry).length;
  const rajin = rows.filter((r) => (r.score?.total ?? 0) >= 80).length;
  const cukup = rows.filter(
    (r) => (r.score?.total ?? 0) >= 60 && (r.score?.total ?? 0) < 80
  ).length;
  const pembinaan = rows.filter((r) => r.entry && (r.score?.total ?? 0) < 60).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Rekap & Grafik</h1>
          <p className="text-sm text-muted-foreground mt-1">Analisis perkembangan ibadah</p>
        </div>
        <div className="inline-flex rounded-lg border border-border bg-card p-1">
          {[7, 30].map((n) => (
            <button
              key={n}
              onClick={() => setRange(n as 7 | 30)}
              className={
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors " +
                (range === n ? "bg-primary text-primary-foreground" : "text-muted-foreground")
              }
            >
              {n === 7 ? "Mingguan" : "Bulanan"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Mini label="Hari Tercatat" value={`${count}/${range}`} />
        <Mini label="Rata² Skor" value={count ? Math.round(totalSkor / count).toString() : "0"} />
        <Mini label="Hari Rajin" value={rajin.toString()} tone="success" />
        <Mini label="Perlu Pembinaan" value={pembinaan.toString()} tone="danger" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold mb-4">Skor Harian</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.02 170)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="score" fill="oklch(0.65 0.16 165)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold mb-4">Performa per Kategori</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="oklch(0.9 0.02 170)" />
                <PolarAngleAxis dataKey="kategori" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar
                  dataKey="nilai"
                  stroke="oklch(0.6 0.18 165)"
                  fill="oklch(0.65 0.16 165)"
                  fillOpacity={0.45}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-semibold">Tabel Rekap Harian</h3>
          <span className="text-xs text-muted-foreground">
            {range} hari terakhir
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2.5">Tanggal</th>
                <th className="text-center px-3 py-2.5">Sholat</th>
                <th className="text-center px-3 py-2.5">Tilawah</th>
                <th className="text-center px-3 py-2.5">Tahfidz</th>
                <th className="text-center px-3 py-2.5">Qiyam</th>
                <th className="text-center px-3 py-2.5">Puasa</th>
                <th className="text-center px-3 py-2.5">Adab</th>
                <th className="text-center px-3 py-2.5">Skor</th>
                <th className="text-center px-3 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice().reverse().map((r) => {
                const e = r.entry;
                const sc = r.score;
                const st = sc ? statusOf(sc.total) : null;
                const sholatOk = e
                  ? SHOLAT_KEYS.filter((k) => e.sholat[k] === "ontime").length
                  : 0;
                return (
                  <tr key={r.date} className="border-t border-border">
                    <td className="px-4 py-2.5 font-medium">{r.date}</td>
                    <td className="text-center px-3 py-2.5">{e ? `${sholatOk}/5` : "—"}</td>
                    <td className="text-center px-3 py-2.5">{e ? `${e.tilawahHalaman}h` : "—"}</td>
                    <td className="text-center px-3 py-2.5">{e ? `${e.tahfidzBaru}+${e.tahfidzMurajaah}` : "—"}</td>
                    <td className="text-center px-3 py-2.5">{e ? `${e.qiyamRakaat}rk` : "—"}</td>
                    <td className="text-center px-3 py-2.5">{e ? (e.puasa ? "✓" : "—") : "—"}</td>
                    <td className="text-center px-3 py-2.5">{e ? `${e.adab}★` : "—"}</td>
                    <td className="text-center px-3 py-2.5 font-semibold tabular-nums">{sc?.total ?? "—"}</td>
                    <td className="text-center px-3 py-2.5">
                      {st ? (
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{
                            backgroundColor: `color-mix(in oklab, var(--${st.tone}) 18%, transparent)`,
                            color: `var(--${st.tone})`,
                          }}
                        >
                          {st.label}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: "success" | "danger" }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className="mt-2 text-2xl font-bold tabular-nums"
        style={{ color: tone ? `var(--${tone})` : undefined }}
      >
        {value}
      </div>
    </div>
  );
}