import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Save, Star } from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/RoleGuard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const STEPS = [
  {
    title: "Pilih Tanggal",
    description: "Tentukan tanggal ibadah yang ingin kamu isi.",
  },
  {
    title: "Sholat 5 Waktu",
    description: "Isi status sholat kamu untuk lima waktu hari ini.",
  },
  {
    title: "Tilawah Al-Qur'an",
    description: "Masukkan durasi dan jumlah halaman tilawah.",
  },
  {
    title: "Tahfidz",
    description: "Isi capaian hafalan baru dan muraja'ah hari ini.",
  },
  {
    title: "Qiyamul Lail",
    description: "Masukkan jumlah rakaat qiyamul lail jika ada.",
  },
  {
    title: "Puasa Sunnah",
    description: "Tandai jika hari ini kamu menjalankan puasa sunnah.",
  },
  {
    title: "Adab & Kedisiplinan",
    description: "Nilai adab dan kedisiplinan kamu hari ini.",
  },
  {
    title: "Catatan & Konfirmasi",
    description: "Tambahkan catatan bila perlu, lalu simpan input ibadahmu.",
  },
] as const;

function InputPage() {
  const navigate = useNavigate();
  const activeId = useStore((store) => store.activeSantriId);
  const entries = useStore((store) => store.entries);
  const [date, setDate] = useState(todayString());
  const [draft, setDraft] = useState<IbadahEntry>(() => emptyEntry(date, activeId));
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const existing = getEntry(date, activeId);
    setDraft(existing ?? emptyEntry(date, activeId));
  }, [activeId, date]);

  const update = <K extends keyof IbadahEntry>(key: K, value: IbadahEntry[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const totalSteps = STEPS.length;
  const stepMeta = STEPS[currentStep];
  const progressPct = ((currentStep + 1) / totalSteps) * 100;
  const isLastStep = currentStep === totalSteps - 1;
  const today = todayString();
  const hasSubmittedToday = useMemo(
    () => entries.some((entry) => entry.date === today && entry.santriId === activeId),
    [activeId, entries, today],
  );

  const ontimeCount = useMemo(
    () => SHOLAT_KEYS.filter((key) => draft.sholat[key] === "ontime").length,
    [draft.sholat],
  );
  const lateCount = useMemo(
    () => SHOLAT_KEYS.filter((key) => draft.sholat[key] === "late").length,
    [draft.sholat],
  );
  const missCount = useMemo(
    () => SHOLAT_KEYS.filter((key) => draft.sholat[key] === "miss").length,
    [draft.sholat],
  );

  const goDashboard = () => {
    navigate({ to: "/" });
  };

  const goRekap = () => {
    navigate({ to: "/rekap" });
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      goDashboard();
    }
  };

  const handleNext = () => {
    if (currentStep === 0 && date > today) {
      toast.error("Tidak boleh input untuk tanggal masa depan");
      return;
    }

    setCurrentStep((step) => Math.min(step + 1, totalSteps - 1));
  };

  const handlePrev = () => {
    setCurrentStep((step) => Math.max(step - 1, 0));
  };

  const save = () => {
    if (date > today) {
      toast.error("Tidak boleh input untuk tanggal masa depan");
      return;
    }

    upsertEntry({ ...draft, date, santriId: activeId });
    toast.success("Data ibadah tersimpan");
    goDashboard();
  };

  return (
    <RoleGuard allowedRoles={["santri", "santriwati"]}>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent
          className={
            hasSubmittedToday
              ? "max-w-md rounded-3xl border-border p-0"
              : "max-h-[90vh] max-w-3xl overflow-y-auto rounded-3xl border-border p-0"
          }
        >
          {hasSubmittedToday ? (
            <div className="overflow-hidden rounded-3xl bg-card">
              <div
                className="p-6 text-primary-foreground"
                style={{ background: "var(--gradient-primary)" }}
              >
                <DialogHeader className="space-y-2 text-left">
                  <DialogTitle className="text-2xl sm:text-3xl">
                    Keren kamu telah berhasil input ibadah hari ini.
                  </DialogTitle>
                  <DialogDescription className="text-primary-foreground/85">
                    Input hari ini sudah tercatat. Kamu bisa kembali ke dashboard atau langsung
                    lihat rekap ibadahmu.
                  </DialogDescription>
                </DialogHeader>
              </div>

              <DialogFooter className="px-6 py-5 sm:justify-start">
                <Button variant="outline" onClick={goDashboard}>
                  Kembali ke Dashboard
                </Button>
                <Button onClick={goRekap}>Lihat Rekap</Button>
              </DialogFooter>
            </div>
          ) : (
          <div className="overflow-hidden rounded-3xl bg-card">
            <div
              className="p-6 text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              <div className="flex items-start justify-between gap-4 pr-8">
                <div>
                  <div className="text-xs uppercase tracking-[0.24em] opacity-80">
                    Langkah {currentStep + 1} dari {totalSteps}
                  </div>
                  <DialogHeader className="mt-3 space-y-2 text-left">
                    <DialogTitle className="text-2xl sm:text-3xl">{stepMeta.title}</DialogTitle>
                    <DialogDescription className="max-w-2xl text-primary-foreground/85">
                      {stepMeta.description}
                    </DialogDescription>
                  </DialogHeader>
                </div>
              </div>
              <div className="mt-5 h-2 rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            <div className="space-y-6 p-6">
              <div className="rounded-2xl border border-border bg-background/70 p-4">
                <div className="text-sm font-medium">Panduan</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Isi dengan jujur. Kamu bisa kembali ke langkah sebelumnya sebelum menyimpan.
                </p>
              </div>

              {currentStep === 0 ? (
                <StepDate date={date} onChange={setDate} maxDate={today} />
              ) : null}

              {currentStep === 1 ? (
                <StepSholat
                  sholat={draft.sholat}
                  onChange={(key, value) => update("sholat", { ...draft.sholat, [key]: value })}
                />
              ) : null}

              {currentStep === 2 ? (
                <StepTilawah
                  minutes={draft.tilawahMenit}
                  pages={draft.tilawahHalaman}
                  onMinutesChange={(value) => update("tilawahMenit", value)}
                  onPagesChange={(value) => update("tilawahHalaman", value)}
                />
              ) : null}

              {currentStep === 3 ? (
                <StepTahfidz
                  baru={draft.tahfidzBaru}
                  murajaah={draft.tahfidzMurajaah}
                  onBaruChange={(value) => update("tahfidzBaru", value)}
                  onMurajaahChange={(value) => update("tahfidzMurajaah", value)}
                />
              ) : null}

              {currentStep === 4 ? (
                <StepQiyam
                  value={draft.qiyamRakaat}
                  onChange={(value) => update("qiyamRakaat", value)}
                />
              ) : null}

              {currentStep === 5 ? (
                <StepPuasa checked={draft.puasa} onChange={(value) => update("puasa", value)} />
              ) : null}

              {currentStep === 6 ? (
                <StepAdab value={draft.adab} onChange={(value) => update("adab", value)} />
              ) : null}

              {currentStep === 7 ? (
                <StepSummary
                  date={date}
                  draft={draft}
                  ontimeCount={ontimeCount}
                  lateCount={lateCount}
                  missCount={missCount}
                  onCatatanChange={(value) => update("catatan", value)}
                />
              ) : null}
            </div>

            <DialogFooter className="border-t border-border px-6 py-5 sm:justify-between sm:space-x-0">
              <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  {isLastStep
                    ? "Periksa ringkasan, lalu simpan input ibadahmu."
                    : "Lanjutkan sampai langkah terakhir untuk menyimpan."}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  {currentStep > 0 ? (
                    <Button variant="outline" onClick={handlePrev}>
                      <ChevronLeft className="h-4 w-4" />
                      Kembali
                    </Button>
                  ) : null}
                  {isLastStep ? (
                    <Button onClick={save}>
                      <Save className="h-4 w-4" />
                      Simpan Ibadah
                    </Button>
                  ) : (
                    <Button onClick={handleNext}>
                      Lanjut
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </DialogFooter>
          </div>
          )}
        </DialogContent>
      </Dialog>
    </RoleGuard>
  );
}

function StepDate({
  date,
  onChange,
  maxDate,
}: {
  date: string;
  onChange: (value: string) => void;
  maxDate: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-lg font-semibold">Tanggal Input</div>
        <p className="mt-1 text-sm text-muted-foreground">
          Kamu bisa mengisi hari ini atau memperbarui catatan hari sebelumnya.
        </p>
      </div>

      <label className="block max-w-sm">
        <span className="text-sm font-medium">Pilih tanggal</span>
        <input
          type="date"
          value={date}
          max={maxDate}
          onChange={(event) => onChange(event.target.value)}
          className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm"
        />
      </label>
    </div>
  );
}

function StepSholat({
  sholat,
  onChange,
}: {
  sholat: IbadahEntry["sholat"];
  onChange: (key: SholatKey, value: SholatStatus) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {SHOLAT_KEYS.map((key) => (
        <div key={key} className="rounded-2xl border border-border bg-background p-4">
          <div className="mb-3 text-base font-semibold">{SHOLAT_LABEL[key]}</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {(["ontime", "late", "miss"] as SholatStatus[]).map((statusOption) => (
              <button
                key={statusOption}
                type="button"
                onClick={() => onChange(key, statusOption)}
                className={getSholatButtonClassName(sholat[key], statusOption)}
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
  );
}

function StepTilawah({
  minutes,
  pages,
  onMinutesChange,
  onPagesChange,
}: {
  minutes: number;
  pages: number;
  onMinutesChange: (value: number) => void;
  onPagesChange: (value: number) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <NumberField label="Durasi tilawah (menit)" value={minutes} onChange={onMinutesChange} />
      <NumberField label="Jumlah halaman" value={pages} onChange={onPagesChange} />
    </div>
  );
}

function StepTahfidz({
  baru,
  murajaah,
  onBaruChange,
  onMurajaahChange,
}: {
  baru: number;
  murajaah: number;
  onBaruChange: (value: number) => void;
  onMurajaahChange: (value: number) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <NumberField label="Halaman baru" value={baru} onChange={onBaruChange} />
      <NumberField label="Halaman muraja'ah" value={murajaah} onChange={onMurajaahChange} />
    </div>
  );
}

function StepQiyam({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="max-w-sm">
      <NumberField label="Jumlah rakaat qiyamul lail" value={value} onChange={onChange} />
    </div>
  );
}

function StepPuasa({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-4 rounded-2xl border border-border bg-background p-5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-5 w-5 accent-[color:var(--primary)]"
      />
      <div>
        <div className="text-base font-semibold">Saya berpuasa sunnah hari ini</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Cocok untuk Senin-Kamis, Ayyam Al-Bidh, atau puasa sunnah lainnya.
        </div>
      </div>
    </label>
  );
}

function StepAdab({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-background p-5">
        <div className="text-base font-semibold">Pilih nilai adab hari ini</div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              type="button"
              onClick={() => onChange(rating)}
              className="rounded-xl p-2 transition hover:bg-secondary"
              aria-label={`${rating} bintang`}
            >
              <Star
                className={
                  "h-8 w-8 " +
                  (rating <= value
                    ? "fill-[color:var(--warning)] text-[color:var(--warning)]"
                    : "text-muted-foreground")
                }
              />
            </button>
          ))}
          <span className="ml-2 text-sm text-muted-foreground">{value}/5</span>
        </div>
      </div>
    </div>
  );
}

function StepSummary({
  date,
  draft,
  ontimeCount,
  lateCount,
  missCount,
  onCatatanChange,
}: {
  date: string;
  draft: IbadahEntry;
  ontimeCount: number;
  lateCount: number;
  missCount: number;
  onCatatanChange: (value: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard label="Tanggal" value={date} />
        <SummaryCard label="Sholat On-time" value={`${ontimeCount}/5`} />
        <SummaryCard label="Sholat Telat" value={`${lateCount}/5`} />
        <SummaryCard label="Sholat Tidak" value={`${missCount}/5`} />
        <SummaryCard
          label="Tilawah"
          value={`${draft.tilawahMenit} menit / ${draft.tilawahHalaman} hlm`}
        />
        <SummaryCard
          label="Tahfidz"
          value={`${draft.tahfidzBaru} baru / ${draft.tahfidzMurajaah} muraja'ah`}
        />
        <SummaryCard label="Qiyamul Lail" value={`${draft.qiyamRakaat} rakaat`} />
        <SummaryCard label="Puasa Sunnah" value={draft.puasa ? "Ya" : "Tidak"} />
        <SummaryCard label="Adab" value={`${draft.adab}/5`} />
      </div>

      <div className="rounded-2xl border border-border bg-background p-5">
        <div className="mb-2 flex items-center gap-2 text-base font-semibold">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          Catatan Tambahan
        </div>
        <textarea
          value={draft.catatan}
          onChange={(event) => onCatatanChange(event.target.value)}
          rows={4}
          placeholder="Catatan tambahan untuk ibadah hari ini..."
          className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm"
        />
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 text-base font-semibold">{value}</div>
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
    <label className="block rounded-2xl border border-border bg-background p-4">
      <span className="text-sm font-medium">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))}
        className="mt-3 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm"
      />
    </label>
  );
}

function getSholatButtonClassName(currentValue: SholatStatus, option: SholatStatus) {
  const isActive = currentValue === option;

  if (!isActive) {
    return "rounded-xl bg-secondary px-3 py-2 font-medium text-secondary-foreground transition hover:bg-accent";
  }

  if (option === "ontime") {
    return "rounded-xl bg-[color:var(--success)] px-3 py-2 font-medium text-[color:var(--success-foreground)]";
  }

  if (option === "late") {
    return "rounded-xl bg-[color:var(--warning)] px-3 py-2 font-medium text-[color:var(--warning-foreground)]";
  }

  return "rounded-xl bg-[color:var(--danger)] px-3 py-2 font-medium text-[color:var(--danger-foreground)]";
}
