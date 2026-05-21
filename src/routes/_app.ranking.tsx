import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore, scoreEntry, lastNDates } from "@/lib/ibadah-store";
import { Trophy, Medal, Award } from "lucide-react";

export const Route = createFileRoute("/_app/ranking")({
  component: RankingPage,
  head: () => ({ meta: [{ title: "Ranking — Rekap Santri" }] }),
});

function RankingPage() {
  const santri = useStore((s) => s.santri);
  const entries = useStore((s) => s.entries);
  const activeId = useStore((s) => s.activeSantriId);
  const [range, setRange] = useState<7 | 30>(30);
  const [asrama, setAsrama] = useState<string>("all");

  const asramaList = Array.from(new Set(santri.map((s) => s.asrama)));

  const ranking = useMemo(() => {
    const dates = new Set(lastNDates(range));
    const rows = santri
      .filter((s) => asrama === "all" || s.asrama === asrama)
      .map((s) => {
        const ents = entries.filter((e) => e.santriId === s.id && dates.has(e.date));
        const scores = ents.map((e) => scoreEntry(e).total);
        const total = scores.reduce((a, b) => a + b, 0);
        const avg = scores.length ? total / scores.length : 0;
        return { ...s, total, avg: Math.round(avg), count: scores.length };
      })
      .sort((a, b) => b.avg - a.avg);
    return rows;
  }, [santri, entries, range, asrama]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Ranking Santri</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Diurutkan berdasarkan rata-rata skor harian
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={asrama}
            onChange={(e) => setAsrama(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm"
          >
            <option value="all">Semua Asrama</option>
            {asramaList.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <div className="inline-flex rounded-lg border border-border bg-card p-1">
            {[7, 30].map((n) => (
              <button
                key={n}
                onClick={() => setRange(n as 7 | 30)}
                className={
                  "px-3 py-1 text-xs font-medium rounded-md transition-colors " +
                  (range === n ? "bg-primary text-primary-foreground" : "text-muted-foreground")
                }
              >
                {n === 7 ? "Mingguan" : "Bulanan"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Podium */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[1, 0, 2].map((idx) => {
          const r = ranking[idx];
          if (!r) return <div key={idx} />;
          const sizes = [0, "scale-110", 0];
          const colors = [
            "from-zinc-300 to-zinc-400",
            "from-amber-300 to-amber-500",
            "from-orange-300 to-orange-500",
          ];
          const Icon = idx === 0 ? Trophy : idx === 1 ? Medal : Award;
          return (
            <div
              key={r.id}
              className={`rounded-2xl border border-border bg-card p-4 text-center ${idx === 0 ? "scale-105" : ""}`}
            >
              <div
                className={`mx-auto h-12 w-12 rounded-full bg-gradient-to-br ${colors[idx]} flex items-center justify-center text-white`}
              >
                <Icon className="h-6 w-6" />
              </div>
              <div className="mt-2 text-xs font-medium text-muted-foreground">#{idx + 1}</div>
              <div className="font-semibold text-sm truncate">{r.nama}</div>
              <div className="text-2xl font-bold tabular-nums mt-1">{r.avg}</div>
              <div className="text-[11px] text-muted-foreground">{r.asrama}</div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 w-12">#</th>
              <th className="text-left px-3 py-3">Nama</th>
              <th className="text-left px-3 py-3 hidden sm:table-cell">Kelas</th>
              <th className="text-left px-3 py-3 hidden md:table-cell">Asrama</th>
              <th className="text-center px-3 py-3">Hari</th>
              <th className="text-center px-3 py-3">Skor Rata²</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((r, i) => (
              <tr
                key={r.id}
                className={
                  "border-t border-border " + (r.id === activeId ? "bg-primary/5" : "")
                }
              >
                <td className="px-4 py-3 font-semibold text-muted-foreground">{i + 1}</td>
                <td className="px-3 py-3 font-medium">
                  {r.nama}
                  {r.id === activeId && (
                    <span className="ml-2 text-[10px] font-semibold uppercase text-primary">Anda</span>
                  )}
                </td>
                <td className="px-3 py-3 hidden sm:table-cell text-muted-foreground">{r.kelas}</td>
                <td className="px-3 py-3 hidden md:table-cell text-muted-foreground">{r.asrama}</td>
                <td className="px-3 py-3 text-center text-muted-foreground">{r.count}</td>
                <td className="px-3 py-3 text-center font-bold tabular-nums">{r.avg}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}