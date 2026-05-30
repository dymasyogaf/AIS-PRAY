import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, RotateCcw } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { filterSantriForRole, useAuth } from "@/lib/auth-store";
import {
  setActiveSantri,
  updatePembinaanFollowUp,
  useStore,
  getPembinaanStreak,
} from "@/lib/ibadah-store";

export const Route = createFileRoute("/_app/butuh-pembinaan")({
  component: ButuhPembinaanPage,
  head: () => ({ meta: [{ title: "Butuh Pembinaan - Rekap Santri" }] }),
});

function ButuhPembinaanPage() {
  const { session } = useAuth();
  const allSantri = useStore((store) => store.santri);
  const entries = useStore((store) => store.entries);
  const pembinaan = useStore((store) => store.pembinaan);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const santri = useMemo(
    () => (session ? filterSantriForRole(session.role, allSantri) : []),
    [allSantri, session],
  );
  const santriLabel = santri[0]?.gender === "putri" ? "santriwati" : "santri";

  const pembinaanList = useMemo(
    () =>
      santri
        .map((item) => {
          const pembinaanStreak = getPembinaanStreak(entries, item.id);
          return {
            ...item,
            pembinaanStreak,
            followUp: pembinaan[item.id],
          };
        })
        .filter((item) => item.pembinaanStreak >= 3)
        .sort(
          (left, right) =>
            right.pembinaanStreak - left.pembinaanStreak || left.nama.localeCompare(right.nama),
        ),
    [entries, pembinaan, santri],
  );

  useEffect(() => {
    setDrafts((current) => {
      const next = { ...current };
      pembinaanList.forEach((item) => {
        if (!(item.id in next)) {
          next[item.id] = item.followUp?.catatan ?? "";
        }
      });

      Object.keys(next).forEach((santriId) => {
        if (!pembinaanList.some((item) => item.id === santriId)) {
          delete next[santriId];
        }
      });

      return next;
    });
  }, [pembinaanList]);

  const selesaiCount = pembinaanList.filter((item) => item.followUp?.selesai).length;
  const belumCount = pembinaanList.length - selesaiCount;

  return (
    <RoleGuard allowedRoles={["musyrif", "musyrifah"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Butuh Pembinaan</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pantau {santriLabel} yang sedang perlu pembinaan 3 kali berturut-turut dan tandai tindak
            lanjutnya.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Mini label="Total Santri" value={pembinaanList.length.toString()} />
          <Mini label="Belum Selesai" value={belumCount.toString()} tone="danger" />
          <Mini label="Selesai Dibina" value={selesaiCount.toString()} tone="success" />
          <Mini label="Kriteria" value="3x berturut" />
        </div>

        {pembinaanList.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {pembinaanList.map((item) => {
              const followUp = item.followUp;
              const catatan = drafts[item.id] ?? "";

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-border bg-card p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{item.nama}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.kelas} - {item.asrama}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-danger/10 px-2.5 py-1 text-xs font-semibold text-danger">
                        {item.pembinaanStreak}x berturut-turut
                      </span>
                      <span
                        className={
                          "rounded-full px-2.5 py-1 text-xs font-semibold " +
                          (followUp?.selesai
                            ? "bg-success/10 text-success"
                            : "bg-warning/10 text-warning")
                        }
                      >
                        {followUp?.selesai ? "Selesai" : "Belum selesai"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <label className="block">
                      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Keterangan Pembinaan
                      </div>
                      <textarea
                        value={catatan}
                        onChange={(event) =>
                          setDrafts((current) => ({ ...current, [item.id]: event.target.value }))
                        }
                        placeholder="Tulis catatan pembinaan santri ini..."
                        className="min-h-28 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                      />
                    </label>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updatePembinaanFollowUp(item.id, {
                            catatan,
                          })
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium transition hover:bg-secondary"
                      >
                        <ClipboardList className="h-4 w-4" />
                        Simpan Keterangan
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updatePembinaanFollowUp(item.id, {
                            catatan,
                            selesai: !followUp?.selesai,
                          })
                        }
                        className={
                          "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition " +
                          (followUp?.selesai
                            ? "border border-border bg-background hover:bg-secondary"
                            : "bg-primary text-primary-foreground hover:opacity-90")
                        }
                      >
                        {followUp?.selesai ? (
                          <>
                            <RotateCcw className="h-4 w-4" />
                            Buka Lagi
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            Tandai Selesai
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveSantri(item.id)}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium transition hover:bg-secondary"
                      >
                        Pilih Santri
                      </button>

                      <Link
                        to="/rekap"
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium transition hover:bg-secondary"
                      >
                        Lihat Rekap
                      </Link>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {followUp?.updatedAt
                        ? `Terakhir diperbarui: ${new Date(followUp.updatedAt).toLocaleString("id-ID")}`
                        : "Belum ada tindak lanjut yang disimpan."}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-10 text-center">
            <div className="text-base font-semibold">
              Belum ada {santriLabel} yang butuh pembinaan
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              Daftar ini akan terisi otomatis saat ada santri dengan status perlu pembinaan 3 kali
              berturut-turut.
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
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
  const toneClass =
    tone === "success"
      ? "border-success/20 bg-success/5"
      : tone === "danger"
        ? "border-danger/20 bg-danger/5"
        : "border-border bg-card";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
