import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Award, Medal, Trophy } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { lastNDates, scoreEntry, useStore } from "@/lib/ibadah-store";

export const Route = createFileRoute("/_app/ranking")({
  component: RankingPage,
  head: () => ({ meta: [{ title: "Ranking - Rekap Santri" }] }),
});

function RankingPage() {
  const santri = useStore((store) => store.santri);
  const entries = useStore((store) => store.entries);
  const activeId = useStore((store) => store.activeSantriId);
  const [range, setRange] = useState<7 | 30>(30);
  const [asrama, setAsrama] = useState<string>("all");

  const asramaList = Array.from(new Set(santri.map((item) => item.asrama)));

  const ranking = useMemo(() => {
    const dates = new Set(lastNDates(range));

    return santri
      .filter((item) => asrama === "all" || item.asrama === asrama)
      .map((item) => {
        const scores = entries
          .filter((entry) => entry.santriId === item.id && dates.has(entry.date))
          .map((entry) => scoreEntry(entry).total);

        const total = scores.reduce((sum, value) => sum + value, 0);
        const avg = scores.length ? total / scores.length : 0;

        return { ...item, total, avg: Math.round(avg), count: scores.length };
      })
      .sort((left, right) => right.avg - left.avg);
  }, [asrama, entries, range, santri]);

  return (
    <RoleGuard allowedRoles={["musyrif"]}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Ranking Santri</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Diurutkan berdasarkan rata-rata skor harian.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={asrama}
              onChange={(event) => setAsrama(event.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm"
            >
              <option value="all">Semua Asrama</option>
              {asramaList.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <div className="inline-flex rounded-lg border border-border bg-card p-1">
              {[7, 30].map((value) => (
                <button
                  key={value}
                  onClick={() => setRange(value as 7 | 30)}
                  className={
                    "rounded-md px-3 py-1 text-xs font-medium transition-colors " +
                    (range === value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground")
                  }
                >
                  {value === 7 ? "Mingguan" : "Bulanan"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {[1, 0, 2].map((index) => {
            const item = ranking[index];
            if (!item) return <div key={index} />;

            const colors = [
              "from-zinc-300 to-zinc-400",
              "from-amber-300 to-amber-500",
              "from-orange-300 to-orange-500",
            ];
            const Icon = index === 0 ? Trophy : index === 1 ? Medal : Award;

            return (
              <div
                key={item.id}
                className={`rounded-2xl border border-border bg-card p-4 text-center ${index === 0 ? "scale-105" : ""}`}
              >
                <div
                  className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${colors[index]} text-white`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div className="mt-2 text-xs font-medium text-muted-foreground">#{index + 1}</div>
                <div className="truncate text-sm font-semibold">{item.nama}</div>
                <div className="mt-1 text-2xl font-bold tabular-nums">{item.avg}</div>
                <div className="text-[11px] text-muted-foreground">{item.asrama}</div>
              </div>
            );
          })}
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="w-12 px-4 py-3 text-left">#</th>
                <th className="px-3 py-3 text-left">Nama</th>
                <th className="hidden px-3 py-3 text-left sm:table-cell">Kelas</th>
                <th className="hidden px-3 py-3 text-left md:table-cell">Asrama</th>
                <th className="px-3 py-3 text-center">Hari</th>
                <th className="px-3 py-3 text-center">Skor Rata-rata</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((item, index) => (
                <tr
                  key={item.id}
                  className={
                    "border-t border-border " + (item.id === activeId ? "bg-primary/5" : "")
                  }
                >
                  <td className="px-4 py-3 font-semibold text-muted-foreground">{index + 1}</td>
                  <td className="px-3 py-3 font-medium">
                    {item.nama}
                    {item.id === activeId ? (
                      <span className="ml-2 text-[10px] font-semibold uppercase text-primary">
                        Aktif
                      </span>
                    ) : null}
                  </td>
                  <td className="hidden px-3 py-3 text-muted-foreground sm:table-cell">
                    {item.kelas}
                  </td>
                  <td className="hidden px-3 py-3 text-muted-foreground md:table-cell">
                    {item.asrama}
                  </td>
                  <td className="px-3 py-3 text-center text-muted-foreground">{item.count}</td>
                  <td className="px-3 py-3 text-center font-bold tabular-nums">{item.avg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </RoleGuard>
  );
}
