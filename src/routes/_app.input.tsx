import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Save, Star } from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/RoleGuard";
import {
  SHOLAT_KEYS,
  emptyEntry,
  getEntry,
  todayString,
  upsertEntry,
  useStore,
  type IbadahEntry,
  type SholatKey,
  type SholatStatus,
} from "@/lib/ibadah-store";

export const Route = createFileRoute("/_app/input")({
  component: InputPage,
  head: () => ({
    meta: [{ title: "Input Ibadah - Rekap Santri" }],
  }),
});

const SHOLAT_LABEL: Record<SholatKey, string> = {
  subuh: "Subuh",
  dzuhur: "Dzuhur",
  ashar: "Ashar",
  maghrib: "Maghrib",
  isya: "Isya",
};

function InputPage() {
  const activeId = useStore((store) => store.activeSantriId);
  const [date, setDate] = useState(todayString());
  const [draft, setDraft] = useState<IbadahEntry>(() => emptyEntry(date, activeId));

  useEffect(() => {
    const existing = getEntry(date, activeId);
    setDraft(existing ?? emptyEntry(date, activeId));
  }, [activeId, date]);

  const update = <K extends keyof IbadahEntry>(key: K, value: IbadahEntry[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const save = () => {
    if (date > todayString()) {
      toast.error("Tidak boleh input untuk tanggal masa depan");
      return;
    }

    upsertEntry({ ...draft, date, santriId: activeId });
    toast.success("Data ibadah tersimpan");
  };

  return (
    <RoleGuard allowedRoles={["santri"]}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Input Ibadah Harian</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Catat ibadah harian untuk kebutuhan pemantauan musyrif.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              max={todayString()}
              onChange={(event) => setDate(event.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
            <button
              onClick={save}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              <Save className="h-4 w-4" />
              Simpan
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold">Panduan Pengisian</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Isikan aktivitas ibadah dengan jujur. Penilaian skor dan status hanya ditampilkan di
            akun musyrif.
          </p>
        </div>

        <Section title="Sholat 5 Waktu">
          <div className="grid gap-3 sm:grid-cols-5">
            {SHOLAT_KEYS.map((key) => (
              <div key={key} className="rounded-lg border border-border bg-background p-3">
                <div className="mb-2 text-sm font-medium">{SHOLAT_LABEL[key]}</div>
                <div className="grid grid-cols-3 gap-1 text-xs">
                  {(["ontime", "late", "miss"] as SholatStatus[]).map((statusOption) => (
                    <button
                      key={statusOption}
                      onClick={() => update("sholat", { ...draft.sholat, [key]: statusOption })}
                      className={
                        "rounded-md px-2 py-1.5 font-medium transition-colors " +
                        (draft.sholat[key] === statusOption
                          ? statusOption === "ontime"
                            ? "bg-[color:var(--success)] text-[color:var(--success-foreground)]"
                            : statusOption === "late"
                              ? "bg-[color:var(--warning)] text-[color:var(--warning-foreground)]"
                              : "bg-[color:var(--danger)] text-[color:var(--danger-foreground)]"
                          : "bg-secondary text-secondary-foreground hover:bg-accent")
                      }
                    >
                      {statusOption === "ontime"
                        ? "On-time"
                        : statusOption === "late"
                          ? "Telat"
                          : "Tidak"}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <div className="grid gap-4 md:grid-cols-2">
          <Section title="Tilawah Al-Qur'an">
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Durasi (menit)"
                value={draft.tilawahMenit}
                onChange={(value) => update("tilawahMenit", value)}
              />
              <NumberField
                label="Jumlah halaman"
                value={draft.tilawahHalaman}
                onChange={(value) => update("tilawahHalaman", value)}
              />
            </div>
          </Section>

          <Section title="Tahfidz">
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Halaman baru"
                value={draft.tahfidzBaru}
                onChange={(value) => update("tahfidzBaru", value)}
              />
              <NumberField
                label="Halaman muraja'ah"
                value={draft.tahfidzMurajaah}
                onChange={(value) => update("tahfidzMurajaah", value)}
              />
            </div>
          </Section>

          <Section title="Qiyamul Lail">
            <NumberField
              label="Jumlah rakaat"
              value={draft.qiyamRakaat}
              onChange={(value) => update("qiyamRakaat", value)}
            />
          </Section>

          <Section title="Puasa Sunnah">
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3">
              <input
                type="checkbox"
                checked={draft.puasa}
                onChange={(event) => update("puasa", event.target.checked)}
                className="h-5 w-5 accent-[color:var(--primary)]"
              />
              <div>
                <div className="text-sm font-medium">Berpuasa hari ini</div>
                <div className="text-xs text-muted-foreground">
                  Senin/Kamis, Ayyam Al-Bidh, dan lainnya
                </div>
              </div>
            </label>
          </Section>
        </div>

        <Section title="Adab & Kedisiplinan">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                onClick={() => update("adab", value)}
                className="p-1"
                aria-label={`${value} bintang`}
              >
                <Star
                  className={
                    "h-7 w-7 " +
                    (value <= draft.adab
                      ? "fill-[color:var(--warning)] text-[color:var(--warning)]"
                      : "text-muted-foreground")
                  }
                />
              </button>
            ))}
            <span className="ml-2 text-sm text-muted-foreground">{draft.adab}/5</span>
          </div>
        </Section>

        <Section title="Catatan Tambahan">
          <textarea
            value={draft.catatan}
            onChange={(event) => update("catatan", event.target.value)}
            rows={3}
            placeholder="Catatan tambahan untuk ibadah hari ini..."
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </Section>
      </div>
    </RoleGuard>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))}
        className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
      />
    </label>
  );
}
