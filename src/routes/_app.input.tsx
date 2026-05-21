import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  useStore,
  todayString,
  getEntry,
  emptyEntry,
  upsertEntry,
  scoreEntry,
  statusOf,
  SHOLAT_KEYS,
  type IbadahEntry,
  type SholatStatus,
  type SholatKey,
} from "@/lib/ibadah-store";
import { toast } from "sonner";
import { Save, Star } from "lucide-react";

export const Route = createFileRoute("/_app/input")({
  component: InputPage,
  head: () => ({
    meta: [{ title: "Input Ibadah — Rekap Santri" }],
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
  const activeId = useStore((s) => s.activeSantriId);
  const [date, setDate] = useState(todayString());
  const [draft, setDraft] = useState<IbadahEntry>(() => emptyEntry(date, activeId));

  useEffect(() => {
    const existing = getEntry(date, activeId);
    setDraft(existing ?? emptyEntry(date, activeId));
  }, [date, activeId]);

  const score = scoreEntry(draft);
  const st = statusOf(score.total);

  const update = <K extends keyof IbadahEntry>(k: K, v: IbadahEntry[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const save = () => {
    if (date > todayString()) {
      toast.error("Tidak boleh input untuk tanggal masa depan");
      return;
    }
    upsertEntry({ ...draft, date, santriId: activeId });
    toast.success("Data ibadah tersimpan");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Input Ibadah Harian</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Catat ibadah harian. Skor terhitung otomatis.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            max={todayString()}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
          <button
            onClick={save}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Save className="h-4 w-4" /> Simpan
          </button>
        </div>
      </div>

      {/* Live score */}
      <div className="rounded-2xl border border-border bg-card p-5 flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">Skor saat ini</div>
          <div className="text-3xl font-bold tabular-nums">{score.total}/100</div>
        </div>
        <span
          className="rounded-full px-3 py-1 text-sm font-semibold"
          style={{
            backgroundColor:
              st.tone === "success"
                ? "color-mix(in oklab, var(--success) 18%, transparent)"
                : st.tone === "warning"
                ? "color-mix(in oklab, var(--warning) 22%, transparent)"
                : "color-mix(in oklab, var(--danger) 18%, transparent)",
            color:
              st.tone === "success"
                ? "var(--success)"
                : st.tone === "warning"
                ? "var(--warning-foreground)"
                : "var(--danger)",
          }}
        >
          {st.label}
        </span>
      </div>

      <Section title="Sholat 5 Waktu" hint="On-time = 6 pts • Terlambat = 2 pts • Tidak = 0">
        <div className="grid sm:grid-cols-5 gap-3">
          {SHOLAT_KEYS.map((k) => (
            <div key={k} className="rounded-lg border border-border p-3 bg-background">
              <div className="text-sm font-medium mb-2">{SHOLAT_LABEL[k]}</div>
              <div className="grid grid-cols-3 gap-1 text-xs">
                {(["ontime", "late", "miss"] as SholatStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => update("sholat", { ...draft.sholat, [k]: s })}
                    className={
                      "rounded-md px-2 py-1.5 font-medium transition-colors " +
                      (draft.sholat[k] === s
                        ? s === "ontime"
                          ? "bg-[color:var(--success)] text-[color:var(--success-foreground)]"
                          : s === "late"
                          ? "bg-[color:var(--warning)] text-[color:var(--warning-foreground)]"
                          : "bg-[color:var(--danger)] text-[color:var(--danger-foreground)]"
                        : "bg-secondary text-secondary-foreground hover:bg-accent")
                    }
                  >
                    {s === "ontime" ? "On-time" : s === "late" ? "Telat" : "Tidak"}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <div className="grid md:grid-cols-2 gap-4">
        <Section title="Tilawah Al-Qur'an">
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Durasi (menit)" value={draft.tilawahMenit} onChange={(v) => update("tilawahMenit", v)} />
            <NumberField label="Jumlah halaman" value={draft.tilawahHalaman} onChange={(v) => update("tilawahHalaman", v)} />
          </div>
        </Section>
        <Section title="Tahfidz">
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Halaman baru" value={draft.tahfidzBaru} onChange={(v) => update("tahfidzBaru", v)} />
            <NumberField label="Halaman muraja'ah" value={draft.tahfidzMurajaah} onChange={(v) => update("tahfidzMurajaah", v)} />
          </div>
        </Section>
        <Section title="Qiyamul Lail">
          <NumberField label="Jumlah rakaat" value={draft.qiyamRakaat} onChange={(v) => update("qiyamRakaat", v)} />
        </Section>
        <Section title="Puasa Sunnah">
          <label className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.puasa}
              onChange={(e) => update("puasa", e.target.checked)}
              className="h-5 w-5 accent-[color:var(--primary)]"
            />
            <div>
              <div className="text-sm font-medium">Berpuasa hari ini</div>
              <div className="text-xs text-muted-foreground">Senin/Kamis, Ayyam Al-Bidh, dll</div>
            </div>
          </label>
        </Section>
      </div>

      <Section title="Adab & Kedisiplinan">
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((r) => (
            <button
              key={r}
              onClick={() => update("adab", r)}
              className="p-1"
              aria-label={`${r} bintang`}
            >
              <Star
                className={
                  "h-7 w-7 " +
                  (r <= draft.adab
                    ? "fill-[color:var(--warning)] text-[color:var(--warning)]"
                    : "text-muted-foreground")
                }
              />
            </button>
          ))}
          <span className="ml-2 text-sm text-muted-foreground">{draft.adab}/5</span>
        </div>
      </Section>

      <Section title="Catatan Musyrif">
        <textarea
          value={draft.catatan}
          onChange={(e) => update("catatan", e.target.value)}
          rows={3}
          placeholder="Catatan khusus dari musyrif..."
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
      </Section>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{title}</h3>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
      />
    </label>
  );
}