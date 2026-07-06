import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { filterSantriForRole, getSantriLabel, useAuth } from "@/lib/auth-store";
import { lastNDates, scoreEntry, setActiveSantri, statusOf, useStore } from "@/lib/ibadah-store";

export const Route = createFileRoute("/_app/santriwati")({
  component: SantriwatiPage,
  head: () => ({ meta: [{ title: "Daftar Santriwati - Rekap Santri" }] }),
});

function SantriwatiPage() {
  const { session } = useAuth();
  const allSantri = useStore((store) => store.santri);
  const entries = useStore((store) => store.entries);
  const activeId = useStore((store) => store.activeSantriId);
  const dates = new Set(lastNDates(7));
  const santri = useMemo(() => {
    if (!session) return [];
    const list = filterSantriForRole(session.role, allSantri);
    return list.filter((item) => item.gender === "putri");
  }, [allSantri, session]);

  return (
    <RoleGuard allowedRoles={["admin", "musyrifah"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Daftar Santriwati</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pilih santriwati untuk melihat ringkasan dan rekap ibadahnya.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {santri.map((item) => {
            const scores = entries
              .filter((entry) => entry.santriId === item.id && dates.has(entry.date))
              .map((entry) => scoreEntry(entry).total);

            const avg = scores.length
              ? Math.round(scores.reduce((total, value) => total + value, 0) / scores.length)
              : 0;
            const status = statusOf(avg);

            return (
              <button
                key={item.id}
                onClick={() => setActiveSantri(item.id)}
                className={
                  "text-left rounded-2xl border p-4 transition-all hover:shadow-md " +
                  (item.id === activeId
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40")
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-full font-semibold text-primary-foreground"
                      style={{ background: "var(--gradient-primary)" }}
                    >
                      {item.nama
                        .split(" ")
                        .map((word) => word[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div>
                      <div className="font-semibold">{item.nama}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.kelas} - {item.asrama}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">Rata-rata 7 hari</span>
                  <span
                    className="rounded-full px-2 py-0.5 font-semibold"
                    style={{
                      backgroundColor: `color-mix(in oklab, var(--${status.tone}) 18%, transparent)`,
                      color: `var(--${status.tone})`,
                    }}
                  >
                    {avg} | {status.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </RoleGuard>
  );
}
