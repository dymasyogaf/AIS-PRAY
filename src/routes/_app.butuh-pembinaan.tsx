import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";

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
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="min-w-[640px] w-full text-sm">
                <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="w-12 px-4 py-3 text-left">#</th>
                    <th className="px-3 py-3 text-left">Nama</th>
                    <th className="px-3 py-3 text-left">Kelas</th>
                    <th className="px-3 py-3 text-left">Asrama</th>
                    <th className="px-3 py-3 text-center">Pembinaan</th>
                    <th className="px-3 py-3 text-center">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {pembinaanList.map((item, index) => {
                    const followUp = item.followUp;
                    const status = followUp?.selesai ? "Selesai" : (followUp?.catatan === "Proses" ? "Proses" : "Belum");

                    return (
                      <tr key={item.id} className="border-t border-border hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-3 font-semibold text-muted-foreground">{index + 1}</td>
                        <td className="px-3 py-3 font-medium">
                          <Link 
                            to="/rekap" 
                            onClick={() => setActiveSantri(item.id)}
                            className="hover:text-primary hover:underline transition-colors"
                          >
                            {item.nama}
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">{item.kelas}</td>
                        <td className="px-3 py-3 text-muted-foreground">{item.asrama}</td>
                        <td className="px-3 py-3 text-center">
                          <span className="font-bold tabular-nums text-danger">
                            {item.pembinaanStreak} Hari
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <select
                            value={status}
                            onChange={(e) => {
                              const val = e.target.value;
                              updatePembinaanFollowUp(item.id, {
                                catatan: val,
                                selesai: val === "Selesai"
                              });
                            }}
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold border-none outline-none cursor-pointer ${
                              status === "Selesai" ? "bg-success/10 text-success" :
                              status === "Proses" ? "bg-warning/10 text-warning" :
                              "bg-danger/10 text-danger"
                            }`}
                          >
                            <option value="Belum" className="text-black bg-background">Belum</option>
                            <option value="Proses" className="text-black bg-background">Proses</option>
                            <option value="Selesai" className="text-black bg-background">Selesai</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
