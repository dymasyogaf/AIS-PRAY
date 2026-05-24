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
import { filterSantriForRole, isSupervisorRole, useAuth } from "@/lib/auth-store";
import { SHOLAT_KEYS, scoreEntry, statusOf, type IbadahEntry, useStore } from "@/lib/ibadah-store";

export const Route = createFileRoute("/_app/rekap")({
  component: RekapPage,
  head: () => ({ meta: [{ title: "Rekap - Rekap Santri" }] }),
});

type PeriodMode = "weekly" | "monthly" | "yearly";
type WeekOptionKey = "week1" | "week2" | "week3" | "current";
type GroupBy = "day" | "month";

interface DailyRow {
  key: string;
  label: string;
  date: string;
  entry: IbadahEntry | undefined;
  score: ReturnType<typeof scoreEntry> | null;
  sholatOntime: number;
}

interface MonthRow {
  key: string;
  label: string;
  entries: IbadahEntry[];
  recordedDays: number;
  sholatAverage: number;
  tilawahMinutes: number;
  tilawahPages: number;
  tahfidzTotal: number;
  qiyamTotal: number;
  puasaCount: number;
  adabAverage: number;
  scoreAverage: number;
}

function RekapPage() {
  const { session } = useAuth();
  const activeId = useStore((store) => store.activeSantriId);
  const allSantri = useStore((store) => store.santri);
  const entries = useStore((store) => store.entries);
  const now = useMemo(() => getTodayAtNoon(), []);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const [periodMode, setPeriodMode] = useState<PeriodMode>("weekly");
  const [selectedWeek, setSelectedWeek] = useState<WeekOptionKey>("current");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const isSupervisor = session ? isSupervisorRole(session.role) : false;
  const accessibleSantri =
    session && isSupervisor
      ? filterSantriForRole(session.role, allSantri)
      : allSantri.filter((item) => item.id === session?.santriId);
  const activeSantri = accessibleSantri.find((item) => item.id === activeId) ?? accessibleSantri[0];
  const selectedSantriId = activeSantri?.id ?? activeId;

  const weekOptions = useMemo(() => getWeekOptions(now), [now]);
  const monthOptions = useMemo(
    () => getMonthOptions(currentYear, currentMonth),
    [currentMonth, currentYear],
  );
  const yearOptions = useMemo(() => getYearOptions(currentYear), [currentYear]);

  const period = useMemo(() => {
    if (periodMode === "weekly") {
      const option = weekOptions.find((item) => item.key === selectedWeek) ?? weekOptions[0];
      return {
        label: option.label,
        caption: option.caption,
        start: option.start,
        end: option.end,
        totalDays: diffDaysInclusive(option.start, option.end),
        groupBy: "day" as GroupBy,
      };
    }

    if (periodMode === "monthly") {
      const start = new Date(currentYear, selectedMonth, 1, 12);
      const end =
        selectedMonth === currentMonth
          ? now
          : new Date(currentYear, selectedMonth, daysInMonth(currentYear, selectedMonth), 12);
      return {
        label: monthName(selectedMonth),
        caption: `Rekap bulan ${monthName(selectedMonth)}`,
        start,
        end,
        totalDays: diffDaysInclusive(start, end),
        groupBy: "day" as GroupBy,
      };
    }

    const start = new Date(selectedYear, 0, 1, 12);
    const end = selectedYear === currentYear ? now : new Date(selectedYear, 11, 31, 12);
    return {
      label: selectedYear.toString(),
      caption: `Rekap tahun ${selectedYear}`,
      start,
      end,
      totalDays: diffDaysInclusive(start, end),
      groupBy: "month" as GroupBy,
    };
  }, [
    currentMonth,
    currentYear,
    now,
    periodMode,
    selectedMonth,
    selectedWeek,
    selectedYear,
    weekOptions,
  ]);

  const periodEntries = useMemo(
    () =>
      entries.filter(
        (item) =>
          item.santriId === selectedSantriId &&
          item.date >= toDateKey(period.start) &&
          item.date <= toDateKey(period.end),
      ),
    [entries, period.end, period.start, selectedSantriId],
  );

  const dailyRows = useMemo(
    () => (period.groupBy === "day" ? buildDailyRows(period.start, period.end, periodEntries) : []),
    [period.end, period.groupBy, period.start, periodEntries],
  );

  const monthRows = useMemo(
    () =>
      period.groupBy === "month" ? buildMonthRows(selectedYear, period.end, periodEntries) : [],
    [period.end, period.groupBy, periodEntries, selectedYear],
  );

  const analyticRows = useMemo(
    () =>
      periodEntries.map((entry) => ({
        entry,
        score: scoreEntry(entry),
        sholatOntime: SHOLAT_KEYS.filter((item) => entry.sholat[item] === "ontime").length,
      })),
    [periodEntries],
  );
  const scoreRadarData = [
    { kategori: "Sholat", nilai: averageScorePart(analyticRows, "sholat", 30) },
    { kategori: "Tilawah", nilai: averageScorePart(analyticRows, "tilawah", 15) },
    { kategori: "Tahfidz", nilai: averageScorePart(analyticRows, "tahfidz", 15) },
    { kategori: "Qiyam", nilai: averageScorePart(analyticRows, "qiyam", 15) },
    { kategori: "Puasa", nilai: averageScorePart(analyticRows, "puasa", 10) },
    { kategori: "Adab", nilai: averageScorePart(analyticRows, "adab", 15) },
  ];

  const activityRadarData = [
    { kategori: "Sholat On-Time", nilai: averageSholatOntime(analyticRows) },
    {
      kategori: "Tilawah",
      nilai: completionRate(analyticRows, (row) => (row.entry?.tilawahMenit ?? 0) > 0),
    },
    {
      kategori: "Tahfidz",
      nilai: completionRate(
        analyticRows,
        (row) => (row.entry?.tahfidzBaru ?? 0) + (row.entry?.tahfidzMurajaah ?? 0) > 0,
      ),
    },
    {
      kategori: "Qiyam",
      nilai: completionRate(analyticRows, (row) => (row.entry?.qiyamRakaat ?? 0) > 0),
    },
    { kategori: "Puasa", nilai: completionRate(analyticRows, (row) => row.entry?.puasa === true) },
    { kategori: "Adab", nilai: averageAdab(analyticRows) },
  ];

  const chartTitle =
    period.groupBy === "month"
      ? isSupervisor
        ? "Skor per Bulan"
        : "Tilawah per Bulan"
      : isSupervisor
        ? "Skor Harian"
        : "Tilawah Harian";

  const chartData =
    period.groupBy === "month"
      ? monthRows.map((row) => ({
          date: row.label,
          value: isSupervisor ? row.scoreAverage : row.tilawahMinutes,
        }))
      : dailyRows.map((row) => ({
          date: row.label,
          value: isSupervisor ? (row.score?.total ?? 0) : (row.entry?.tilawahMenit ?? 0),
        }));

  const totalSkor = periodEntries.reduce((total, entry) => total + scoreEntry(entry).total, 0);
  const count = periodEntries.length;
  const rajin = periodEntries.filter((entry) => scoreEntry(entry).total >= 80).length;
  const pembinaan = periodEntries.filter((entry) => scoreEntry(entry).total < 60).length;
  const puasaCount = periodEntries.filter((entry) => entry.puasa).length;
  const totalTilawah = periodEntries.reduce((total, entry) => total + entry.tilawahMenit, 0);
  const avgAdab = count
    ? (periodEntries.reduce((total, entry) => total + entry.adab, 0) / count).toFixed(1)
    : "0.0";

  return (
    <RoleGuard allowedRoles={["musyrif", "musyrifah", "santri", "santriwati"]}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {isSupervisor ? "Rekap Santri" : "Rekap Ibadah Saya"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isSupervisor
                ? `Analisis perkembangan ibadah ${activeSantri?.nama ?? "santri aktif"}`
                : `Ringkasan aktivitas ibadah ${activeSantri?.nama ?? "Anda"}`}
            </p>
            <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
              {period.caption}
            </p>
          </div>

          <div className="space-y-3">
            <div className="inline-flex rounded-lg border border-border bg-card p-1">
              {[
                { key: "weekly", label: "Mingguan" },
                { key: "monthly", label: "Bulanan" },
                { key: "yearly", label: "Tahun" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setPeriodMode(item.key as PeriodMode)}
                  className={
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
                    (periodMode === item.key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground")
                  }
                >
                  {item.label}
                </button>
              ))}
            </div>

            {periodMode === "weekly" ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {weekOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setSelectedWeek(option.key)}
                    className={
                      "rounded-lg border px-3 py-2 text-left text-sm transition-colors " +
                      (selectedWeek === option.key
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:bg-secondary")
                    }
                  >
                    <div className="font-medium">{option.label}</div>
                    <div className="mt-1 text-[11px]">{option.caption}</div>
                  </button>
                ))}
              </div>
            ) : null}

            {periodMode === "monthly" ? (
              <select
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(Number(event.target.value))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : null}

            {periodMode === "yearly" ? (
              <select
                value={selectedYear}
                onChange={(event) => setSelectedYear(Number(event.target.value))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        </div>

        {isSupervisor ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Mini label="Hari Tercatat" value={`${count}/${period.totalDays}`} />
            <Mini
              label="Rata-rata Skor"
              value={count ? Math.round(totalSkor / count).toString() : "0"}
            />
            <Mini label="Hari Rajin" value={rajin.toString()} tone="success" />
            <Mini label="Perlu Pembinaan" value={pembinaan.toString()} tone="danger" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Mini label="Hari Tercatat" value={`${count}/${period.totalDays}`} />
            <Mini label="Tilawah" value={`${totalTilawah} menit`} />
            <Mini label="Puasa Sunnah" value={`${puasaCount} hari`} />
            <Mini label="Rata-rata Adab" value={avgAdab} />
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
            <h3 className="mb-4 font-semibold">{chartTitle}</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.02 170)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={isSupervisor ? [0, 100] : undefined} />
                  <Tooltip />
                  <Bar dataKey="value" fill="oklch(0.65 0.16 165)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-4 font-semibold">
              {isSupervisor ? "Performa per Kategori" : "Konsistensi Aktivitas"}
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={isSupervisor ? scoreRadarData : activityRadarData}>
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

        {period.groupBy === "month" ? (
          <MonthTable rows={monthRows} isSupervisor={isSupervisor} periodLabel={period.label} />
        ) : (
          <DailyTable rows={dailyRows} isSupervisor={isSupervisor} periodLabel={period.label} />
        )}
      </div>
    </RoleGuard>
  );
}

function DailyTable({
  rows,
  isSupervisor,
  periodLabel,
}: {
  rows: DailyRow[];
  isSupervisor: boolean;
  periodLabel: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-5">
        <h3 className="font-semibold">Tabel Rekap Harian</h3>
        <span className="text-xs text-muted-foreground">{periodLabel}</span>
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
              {isSupervisor ? <th className="px-3 py-2.5 text-center">Skor</th> : null}
              {isSupervisor ? <th className="px-3 py-2.5 text-center">Status</th> : null}
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
                  <tr key={row.key} className="border-t border-border">
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
                    <td className="px-3 py-2.5 text-center">{entry ? `${entry.adab}/5` : "-"}</td>
                    {isSupervisor ? (
                      <td className="px-3 py-2.5 text-center font-semibold tabular-nums">
                        {score?.total ?? "-"}
                      </td>
                    ) : null}
                    {isSupervisor ? (
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
  );
}

function MonthTable({
  rows,
  isSupervisor,
  periodLabel,
}: {
  rows: MonthRow[];
  isSupervisor: boolean;
  periodLabel: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-5">
        <h3 className="font-semibold">Tabel Rekap Bulanan</h3>
        <span className="text-xs text-muted-foreground">{periodLabel}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left">Bulan</th>
              <th className="px-3 py-2.5 text-center">Hari</th>
              <th className="px-3 py-2.5 text-center">Sholat</th>
              <th className="px-3 py-2.5 text-center">Tilawah</th>
              <th className="px-3 py-2.5 text-center">Tahfidz</th>
              <th className="px-3 py-2.5 text-center">Qiyam</th>
              <th className="px-3 py-2.5 text-center">Puasa</th>
              <th className="px-3 py-2.5 text-center">Adab</th>
              {isSupervisor ? <th className="px-3 py-2.5 text-center">Skor</th> : null}
              {isSupervisor ? <th className="px-3 py-2.5 text-center">Status</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const status = row.recordedDays ? statusOf(row.scoreAverage) : null;

              return (
                <tr key={row.key} className="border-t border-border">
                  <td className="px-4 py-2.5 font-medium">{row.label}</td>
                  <td className="px-3 py-2.5 text-center">{row.recordedDays}</td>
                  <td className="px-3 py-2.5 text-center">
                    {row.recordedDays ? `${row.sholatAverage.toFixed(1)}/5` : "-"}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {row.recordedDays ? `${row.tilawahPages} hlm` : "-"}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {row.recordedDays ? row.tahfidzTotal : "-"}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {row.recordedDays ? `${row.qiyamTotal} rk` : "-"}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {row.recordedDays ? row.puasaCount : "-"}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {row.recordedDays ? row.adabAverage.toFixed(1) : "-"}
                  </td>
                  {isSupervisor ? (
                    <td className="px-3 py-2.5 text-center font-semibold tabular-nums">
                      {row.recordedDays ? row.scoreAverage : "-"}
                    </td>
                  ) : null}
                  {isSupervisor ? (
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
  );
}

function buildDailyRows(start: Date, end: Date, entries: IbadahEntry[]): DailyRow[] {
  const entryMap = new Map(entries.map((entry) => [entry.date, entry]));
  return enumerateDays(start, end).map((date) => {
    const key = toDateKey(date);
    const entry = entryMap.get(key);
    return {
      key,
      label: `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`,
      date: key,
      entry,
      score: entry ? scoreEntry(entry) : null,
      sholatOntime: entry
        ? SHOLAT_KEYS.filter((item) => entry.sholat[item] === "ontime").length
        : 0,
    };
  });
}

function buildMonthRows(year: number, endDate: Date, entries: IbadahEntry[]): MonthRow[] {
  const lastMonthIndex = endDate.getMonth();
  return Array.from({ length: lastMonthIndex + 1 }, (_, month) => {
    const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
    const monthEntries = entries.filter((entry) => entry.date.startsWith(monthKey));
    const recordedDays = monthEntries.length;
    const scoreAverage = recordedDays
      ? Math.round(
          monthEntries.reduce((total, entry) => total + scoreEntry(entry).total, 0) / recordedDays,
        )
      : 0;
    const sholatAverage = recordedDays
      ? monthEntries.reduce(
          (total, entry) =>
            total + SHOLAT_KEYS.filter((item) => entry.sholat[item] === "ontime").length,
          0,
        ) / recordedDays
      : 0;

    return {
      key: monthKey,
      label: monthName(month, "short"),
      entries: monthEntries,
      recordedDays,
      sholatAverage,
      tilawahMinutes: monthEntries.reduce((total, entry) => total + entry.tilawahMenit, 0),
      tilawahPages: monthEntries.reduce((total, entry) => total + entry.tilawahHalaman, 0),
      tahfidzTotal: monthEntries.reduce(
        (total, entry) => total + entry.tahfidzBaru + entry.tahfidzMurajaah,
        0,
      ),
      qiyamTotal: monthEntries.reduce((total, entry) => total + entry.qiyamRakaat, 0),
      puasaCount: monthEntries.filter((entry) => entry.puasa).length,
      adabAverage: recordedDays
        ? monthEntries.reduce((total, entry) => total + entry.adab, 0) / recordedDays
        : 0,
      scoreAverage,
    };
  });
}

function getWeekOptions(now: Date) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const currentDay = now.getDate();
  const currentWeekStart = Math.floor((currentDay - 1) / 7) * 7 + 1;

  return [
    createWeekOption("week1", "Pekan 1", year, month, 1, 7),
    createWeekOption("week2", "Pekan 2", year, month, 8, 14),
    createWeekOption("week3", "Pekan 3", year, month, 15, 21),
    createWeekOption("current", "Pekan Berjalan", year, month, currentWeekStart, currentDay),
  ];
}

function createWeekOption(
  key: WeekOptionKey,
  label: string,
  year: number,
  month: number,
  startDay: number,
  endDay: number,
) {
  const maxDay = daysInMonth(year, month);
  const safeStart = Math.min(startDay, maxDay);
  const safeEnd = Math.min(Math.max(endDay, safeStart), maxDay);
  return {
    key,
    label,
    caption: `${safeStart}-${safeEnd} ${monthName(month, "short")}`,
    start: new Date(year, month, safeStart, 12),
    end: new Date(year, month, safeEnd, 12),
  };
}

function getMonthOptions(year: number, currentMonth: number) {
  return Array.from({ length: currentMonth + 1 }, (_, month) => ({
    value: month,
    label: `${monthName(month)} ${year}`,
  }));
}

function getYearOptions(currentYear: number) {
  const startYear = 2025;
  return Array.from({ length: currentYear - startYear + 1 }, (_, index) => startYear + index);
}

function monthName(month: number, format: "long" | "short" = "long") {
  return new Intl.DateTimeFormat("id-ID", { month: format }).format(new Date(2026, month, 1, 12));
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getTodayAtNoon() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
}

function enumerateDays(start: Date, end: Date) {
  const out: Date[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    out.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return out;
}

function diffDaysInclusive(start: Date, end: Date) {
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
