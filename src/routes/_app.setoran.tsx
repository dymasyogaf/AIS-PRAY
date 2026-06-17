import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BookOpen } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { RoleGuard } from "@/components/RoleGuard";
import { filterSantriForRole, isSupervisorRole, useAuth } from "@/lib/auth-store";
import {
  lastNDates,
  statusOf,
  useStore,
} from "@/lib/ibadah-store";

export const Route = createFileRoute("/_app/setoran")({
  component: SetoranPage,
  head: () => ({ meta: [{ title: "Data Setoran - Rekap Ibadah" }] }),
});

function SetoranPage() {
  const { session } = useAuth();
  const allSantri = useStore((store) => store.santri);
  const entries = useStore((store) => store.entries);
  const [selectedDays, setSelectedDays] = useState(7);
  
  const santri = useMemo(
    () => (session ? filterSantriForRole(session.role, allSantri) : []),
    [allSantri, session]
  );
  
  const [selectedSantriId, setSelectedSantriId] = useState<string>("all");

  const dates = useMemo(() => lastNDates(selectedDays), [selectedDays]);

  // Aggregate data for chart
  const chartData = useMemo(() => {
    return dates.map((date) => {
      const dayEntries = entries.filter((entry) => 
        entry.date === date && 
        (selectedSantriId === "all" ? santri.some(s => s.id === entry.santriId) : entry.santriId === selectedSantriId)
      );

      const tahfidzBaru = dayEntries.reduce((acc, curr) => acc + curr.tahfidzBaru, 0);
      const tahfidzMurajaah = dayEntries.reduce((acc, curr) => acc + curr.tahfidzMurajaah, 0);
      const tilawahHalaman = dayEntries.reduce((acc, curr) => acc + curr.tilawahHalaman, 0);

      return {
        date: date.slice(5),
        "Tahfidz Baru (Halaman)": tahfidzBaru,
        "Tahfidz Murajaah (Halaman)": tahfidzMurajaah,
        "Tilawah (Halaman)": tilawahHalaman,
      };
    }).reverse(); // chronological order
  }, [dates, entries, santri, selectedSantriId]);

  const summaryData = useMemo(() => {
    const filteredEntries = entries.filter(e => 
        dates.includes(e.date) && 
        (selectedSantriId === "all" ? santri.some(s => s.id === e.santriId) : e.santriId === selectedSantriId)
    );

    return {
      tahfidzBaru: filteredEntries.reduce((acc, curr) => acc + curr.tahfidzBaru, 0),
      tahfidzMurajaah: filteredEntries.reduce((acc, curr) => acc + curr.tahfidzMurajaah, 0),
      tilawahHalaman: filteredEntries.reduce((acc, curr) => acc + curr.tilawahHalaman, 0),
      tilawahMenit: filteredEntries.reduce((acc, curr) => acc + curr.tilawahMenit, 0),
    };
  }, [dates, entries, santri, selectedSantriId]);

  return (
    <RoleGuard allowedRoles={["musyrif", "musyrifah"]}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Data Setoran</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Pantau perkembangan tilawah dan tahfidz santri.
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
            <select
              value={selectedSantriId}
              onChange={(e) => setSelectedSantriId(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">Semua Santri</option>
              {santri.map((s) => (
                <option key={s.id} value={s.id}>{s.nama}</option>
              ))}
            </select>

            <select
              value={selectedDays}
              onChange={(e) => setSelectedDays(Number(e.target.value))}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              <option value={7}>7 Hari Terakhir</option>
              <option value={14}>14 Hari Terakhir</option>
              <option value={30}>30 Hari Terakhir</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 sm:gap-4">
          <StatCard
            label="Total Tahfidz Baru"
            value={`${summaryData.tahfidzBaru} hlm`}
          />
          <StatCard
            label="Total Murajaah"
            value={`${summaryData.tahfidzMurajaah} hlm`}
          />
          <StatCard
            label="Total Tilawah"
            value={`${summaryData.tilawahHalaman} hlm`}
          />
          <StatCard
            label="Durasi Tilawah"
            value={`${summaryData.tilawahMenit} menit`}
          />
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 font-semibold">Grafik Setoran ({selectedDays} Hari)</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.02 170)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Tahfidz Baru (Halaman)" stackId="a" fill="oklch(0.65 0.16 165)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Tahfidz Murajaah (Halaman)" stackId="a" fill="oklch(0.55 0.18 165)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Tilawah (Halaman)" fill="oklch(0.75 0.12 165)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border p-5">
            <h3 className="font-semibold">Detail Setoran Santri</h3>
            <span className="text-xs text-muted-foreground">Akumulasi dalam periode yang dipilih</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[680px] w-full text-sm">
              <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-center w-12">#</th>
                  <th className="px-4 py-3 text-left">Nama Santri</th>
                  <th className="px-3 py-3 text-center">Tahfidz Baru</th>
                  <th className="px-3 py-3 text-center">Murajaah</th>
                  <th className="px-3 py-3 text-center">Tilawah</th>
                  <th className="px-3 py-3 text-center">Durasi Tilawah</th>
                </tr>
              </thead>
              <tbody>
                {santri
                  .filter(s => selectedSantriId === "all" || s.id === selectedSantriId)
                  .map((item) => {
                  const sEntries = entries.filter(e => e.santriId === item.id && dates.includes(e.date));
                  const tBaru = sEntries.reduce((acc, curr) => acc + curr.tahfidzBaru, 0);
                  const tMurajaah = sEntries.reduce((acc, curr) => acc + curr.tahfidzMurajaah, 0);
                  const tilHalaman = sEntries.reduce((acc, curr) => acc + curr.tilawahHalaman, 0);
                  const tilMenit = sEntries.reduce((acc, curr) => acc + curr.tilawahMenit, 0);
                  const total = tBaru + tMurajaah + tilHalaman;

                  return { ...item, tBaru, tMurajaah, tilHalaman, tilMenit, total };
                })
                .sort((a, b) => b.total - a.total)
                .map((item, index) => (
                    <tr key={item.id} className="border-t border-border">
                      <td className="px-4 py-3 text-center font-medium text-muted-foreground">{index + 1}</td>
                      <td className="px-4 py-3 font-medium">{item.nama}</td>
                      <td className="px-3 py-3 text-center tabular-nums">{item.tBaru} hlm</td>
                      <td className="px-3 py-3 text-center tabular-nums">{item.tMurajaah} hlm</td>
                      <td className="px-3 py-3 text-center tabular-nums">{item.tilHalaman} hlm</td>
                      <td className="px-3 py-3 text-center tabular-nums">{item.tilMenit} menit</td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </RoleGuard>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="w-full rounded-2xl border border-border bg-card p-4 text-left">
      <div className="text-xs text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
