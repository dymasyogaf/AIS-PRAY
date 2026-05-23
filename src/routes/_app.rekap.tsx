import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RoleGuard } from "@/components/RoleGuard";
import { useAuth } from "@/lib/auth-store";
import { SHOLAT_KEYS, lastNDates, scoreEntry, statusOf, useStore } from "@/lib/ibadah-store";

export const Route = createFileRoute("/_app/rekap")({
  component: RekapPage,
  head: () => ({ meta: [{ title: "Rekap - Rekap Santri" }] }),
});

function RekapPage() {
  const { session } = useAuth();
  const activeId = useStore((store) => store.activeSantriId);
  const activeSantri = useStore((store) => store.santri.find((item) => item.id === activeId));
  const entries = useStore((store) => store.entries);
  const [range, setRange] = useState<7 | 30>(7);
  const isMusyrif = session?.role === "musyrif";

  const dates = lastNDates(range);
  const rows = useMemo(
    () =>
      dates.map((date) => {
        const entry = entries.find((item) => item.date === date && item.santriId === activeId);
        const score = entry ? scoreEntry(entry) : null;
        const sholatOntime = entry
          ? SHOLAT_KEYS.filter((key) => entry.sholat[key] === "ontime").length
          : 0;

        return { date, entry, score, sholatOntime };
      }),
    [activeId, dates, entries],
  );

  const scoreRadarData = [
    { kategori: "Sholat", nilai: averageScorePart(rows, "sholat", 30) },
    { kategori: "Tilawah", nilai: averageScorePart(rows, "tilawah", 15) },
    { kategori: "Tahfidz", nilai: averageScorePart(rows, "tahfidz", 15) },
    { kategori: "Qiyam", nilai: averageScorePart(rows, "qiyam", 15) },
    { kategori: "Puasa", nilai: averageScorePart(rows, "puasa", 10) },
    { kategori: "Adab", nilai: averageScorePart(rows, "adab", 15) },
  ];

  const activityRadarData = [
    { kategori: "Sholat On-Time", nilai: averageSholatOntime(rows) },
    {
      kategori: "Tilawah",
      nilai: completionRate(rows, (row) => (row.entry?.tilawahMenit ?? 0) > 0),
    },
    {
      kategori: "Tahfidz",
      nilai: completionRate(
        rows,
        (row) => (row.entry?.tahfidzBaru ?? 0) + (row.entry?.tahfidzMurajaah ?? 0) > 0,
      ),
    },
    { kategori: "Qiyam", nilai: completionRate(rows, (row) => (row.entry?.qiyamRakaat ?? 0) > 0) },
    { kategori: "Puasa", nilai: completionRate(rows, (row) => row.entry?.puasa === true) },
    { kategori: "Adab", nilai: averageAdab(rows) },
  ];

  const scoreBarData = rows.map((row) => ({
    date: row.date.slice(5),
    value: row.score?.total ?? 0,
  }));

  const activityBarData = rows.map((row) => ({
    date: row.date.slice(5),
    value: row.entry?.tilawahMenit ?? 0,
  }));

  const totalSkor = rows.reduce((total, row) => total + (row.score?.total ?? 0), 0);
  const count = rows.filter((row) => row.entry).length;
  const rajin = rows.filter((row) => (row.score?.total ?? 0) >= 80).length;
  const pembinaan = rows.filter((row) => row.entry && (row.score?.total ?? 0) < 60).length;
  const puasaCount = rows.filter((row) => row.entry?.puasa).length;
  const totalTilawah = rows.reduce((total, row) => total + (row.entry?.tilawahMenit ?? 0), 0);
  const avgAdab = rows.filter((row) => row.entry).length
    ? (
        rows.reduce((total, row) => total + (row.entry?.adab ?? 0), 0) /
        rows.filter((row) => row.entry).length
      ).toFixed(1)
    : "0.0";

  return (
    <RoleGuard allowedRoles={["musyrif", "santri"]}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {isMusyrif ? "Rekap Santri" : "Rekap Ibadah Saya"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isMusyrif
                ? `Analisis perkembangan ibadah ${activeSantri?.nama ?? "santri aktif"}`
                : `Ringkasan aktivitas ibadah ${activeSantri?.nama ?? "Anda"}`}
            </p>
          </div>
          <div className="inline-flex rounded-lg border border-border bg-card p-1">
            {[7, 30].map((value) => (
              <button
                key={value}
                onClick={() => setRange(value as 7 | 30)}
                className={
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
                  (range === value ? "bg-primary text-primary-foreground" : "text-muted-foreground")
                }
              >
                {value === 7 ? "Mingguan" : "Bulanan"}
              </button>
            ))}
          </div>
        </div>

        {isMusyrif ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Mini label="Hari Tercatat" value={`${count}/${range}`} />
            <Mini
              label="Rata-rata Skor"
              value={count ? Math.round(totalSkor / count).toString() : "0"}
            />
            <Mini label="Hari Rajin" value={rajin.toString()} tone="success" />
            <Mini label="Perlu Pembinaan" value={pembinaan.toString()} tone="danger" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Mini label="Hari Tercatat" value={`${count}/${range}`} />
            <Mini label="Tilawah" value={`${totalTilawah} menit`} />
            <Mini label="Puasa Sunnah" value={`${puasaCount} hari`} />
            <Mini label="Rata-rata Adab" value={avgAdab} />
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
            <h3 className="mb-4 font-semibold">{isMusyrif ? "Skor Harian" : "Tilawah Harian"}</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={isMusyrif ? scoreBarData : activityBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.02 170)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={isMusyrif ? [0, 100] : undefined} />
                  <Tooltip />
                  <Bar dataKey="value" fill="oklch(0.65 0.16 165)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-4 font-semibold">
              {isMusyrif ? "Performa per Kategori" : "Konsistensi Aktivitas"}
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={isMusyrif ? scoreRadarData : activityRadarData}>
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

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border p-5">
            <h3 className="font-semibold">Tabel Rekap Harian</h3>
            <span className="text-xs text-muted-foreground">{range} hari terakhir</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 text-left">Tanggal</th>
                  <th className="px-3 py-2.5 text-center">Sholat</th>
                  <th className="px-3 py-2.5 text-center">Tilawah</th>
                  <th className="px-3 py-2.5 text-center">Tahfidz</th>
                  <th className="px-3 py-2.5 text-center">Qiyam</th>
                  <th className="px-3 py-2.5 text-center">Puasa</th>
                  <th className="px-3 py-2.5 text-center">Adab</th>
                  {isMusyrif ? <th className="px-3 py-2.5 text-center">Skor</th> : null}
                  {isMusyrif ? <th className="px-3 py-2.5 text-center">Status</th> : null}
                </tr>
              </thead>
              <tbody>
                {rows
                  .slice()
                  .reverse()
                  .map((row) => {
                    const entry = row.entry;
                    const score = row.score;
                    const status = score ? statusOf(score.total) : null;

                    return (
                      <tr key={row.date} className="border-t border-border">
                        <td className="px-4 py-2.5 font-medium">{row.date}</td>
                        <td className="px-3 py-2.5 text-center">
                          {entry ? `${row.sholatOntime}/5` : "-"}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {entry ? `${entry.tilawahHalaman} hlm` : "-"}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {entry ? `${entry.tahfidzBaru}+${entry.tahfidzMurajaah}` : "-"}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {entry ? `${entry.qiyamRakaat} rk` : "-"}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {entry ? (entry.puasa ? "Ya" : "-") : "-"}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {entry ? `${entry.adab}/5` : "-"}
                        </td>
                        {isMusyrif ? (
                          <td className="px-3 py-2.5 text-center font-semibold tabular-nums">
                            {score?.total ?? "-"}
                          </td>
                        ) : null}
                        {isMusyrif ? (
                          <td className="px-3 py-2.5 text-center">
                            {status ? (
                              <span
                                className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                                style={{
                                  backgroundColor: `color-mix(in oklab, var(--${status.tone}) 18%, transparent)`,
                                  color: `var(--${status.tone})`,
                                }}
                              >
                                {status.label}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}

function averageScorePart(
  rows: Array<{ score: ReturnType<typeof scoreEntry> | null }>,
  key: keyof ReturnType<typeof scoreEntry>,
  max: number,
) {
  const values = rows.filter((row) => row.score).map((row) => row.score![key] as number);
  return values.length
    ? Math.round((values.reduce((a, b) => a + b, 0) / values.length / max) * 100)
    : 0;
}

function averageSholatOntime(
  rows: Array<{ entry: { sholat: Record<(typeof SHOLAT_KEYS)[number], string> } | undefined }>,
) {
  const values = rows
    .filter((row) => row.entry)
    .map((row) => SHOLAT_KEYS.filter((key) => row.entry!.sholat[key] === "ontime").length);
  return values.length
    ? Math.round((values.reduce((a, b) => a + b, 0) / values.length / 5) * 100)
    : 0;
}

function completionRate(
  rows: Array<{ entry: unknown }>,
  predicate: (row: Array<{ entry: unknown }>[number]) => boolean,
) {
  const total = rows.filter((row) => row.entry).length;
  const done = rows.filter((row) => row.entry && predicate(row)).length;
  return total ? Math.round((done / total) * 100) : 0;
}

function averageAdab(rows: Array<{ entry: { adab: number } | undefined }>) {
  const values = rows.filter((row) => row.entry).map((row) => row.entry!.adab);
  return values.length
    ? Math.round((values.reduce((a, b) => a + b, 0) / values.length / 5) * 100)
    : 0;
}

function Mini({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "danger";
}) {
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
