import { createFileRoute } from "@tanstack/react-router";
import { useStore, setActiveSantri, scoreEntry, lastNDates, statusOf } from "@/lib/ibadah-store";
import { ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_app/santri")({
  component: SantriPage,
  head: () => ({ meta: [{ title: "Daftar Santri — Rekap Santri" }] }),
});

function SantriPage() {
  const santri = useStore((s) => s.santri);
  const entries = useStore((s) => s.entries);
  const activeId = useStore((s) => s.activeSantriId);
  const dates = new Set(lastNDates(7));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Daftar Santri</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pilih santri untuk melihat & input data ibadahnya
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {santri.map((s) => {
          const ents = entries.filter((e) => e.santriId === s.id && dates.has(e.date));
          const scores = ents.map((e) => scoreEntry(e).total);
          const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
          const st = statusOf(avg);
          return (
            <button
              key={s.id}
              onClick={() => setActiveSantri(s.id)}
              className={
                "text-left rounded-2xl border p-4 transition-all hover:shadow-md " +
                (s.id === activeId
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/40")
              }
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className="h-11 w-11 rounded-full flex items-center justify-center font-semibold text-primary-foreground"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    {s.nama.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                  </div>
                  <div>
                    <div className="font-semibold">{s.nama}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.kelas} • {s.asrama}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Rata² 7 hari</span>
                <span
                  className="rounded-full px-2 py-0.5 font-semibold"
                  style={{
                    backgroundColor: `color-mix(in oklab, var(--${st.tone}) 18%, transparent)`,
                    color: `var(--${st.tone})`,
                  }}
                >
                  {avg} • {st.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}