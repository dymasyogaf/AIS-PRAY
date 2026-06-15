import { FormEvent, useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { UserCog } from "lucide-react";
import { toast } from "sonner";
import { useAuth, updateAccount } from "@/lib/auth-store";
import { updateSantriProfile, useStore } from "@/lib/ibadah-store";

export const Route = createFileRoute("/_app/profil")({
  component: ProfilPage,
  head: () => ({
    meta: [{ title: "Profil - Rekap Ibadah Santri" }],
  }),
});

function ProfilPage() {
  const { session } = useAuth();
  const allSantri = useStore((store) => store.santri);
  
  // Protect page only for student roles
  if (!session || !["santri", "santriwati"].includes(session.role)) {
    return <Navigate to="/" />;
  }

  const activeSantri = allSantri.find((s) => s.id === session.santriId);

  const [username, setUsername] = useState(session.username);
  const [password, setPassword] = useState("");
  const [asrama, setAsrama] = useState(activeSantri?.asrama || "");
  const [kelas, setKelas] = useState(activeSantri?.kelas || "X");
  const [jurusan, setJurusan] = useState(activeSantri?.jurusan || "");
  
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const kelasOptions = ["X", "XI", "XII"];

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeSantri) return;

    setIsSaving(true);
    setError("");

    const result = await updateAccount(session.username, {
      username: username.trim(),
      password: password ? password : undefined,
    });

    if (!result.ok) {
      setError(result.message);
      setIsSaving(false);
      return;
    }

    updateSantriProfile(activeSantri.id, {
      kelas,
      asrama: asrama.trim(),
      jurusan: jurusan.trim(),
    });

    toast.success("Profil berhasil diperbarui");
    setPassword("");
    setIsSaving(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <UserCog className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengaturan Profil</h1>
          <p className="text-sm text-muted-foreground">Kelola informasi akun dan asrama Anda.</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8 space-y-6">
        {error ? (
          <div className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        ) : null}

        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-border pb-2">Informasi Akun</h2>
          
          <label className="block">
            <span className="text-sm font-medium">Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username login"
              className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">Password Baru</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Kosongkan jika tidak ingin diubah (min. 6 karakter)"
              className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </div>

        <div className="space-y-4 pt-4">
          <h2 className="text-lg font-semibold border-b border-border pb-2">Data Santri</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium">Kelas</span>
              <select
                value={kelas}
                onChange={(e) => setKelas(e.target.value)}
                className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {kelasOptions.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium">Jurusan (Opsional)</span>
              <input
                type="text"
                value={jurusan}
                onChange={(e) => setJurusan(e.target.value)}
                placeholder="misal: MIPA"
                className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium">Asrama</span>
            <input
              type="text"
              value={asrama}
              onChange={(e) => setAsrama(e.target.value)}
              placeholder="Nama asrama"
              className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50 sm:w-auto sm:min-w-[200px]"
            style={{ background: "var(--gradient-primary)" }}
          >
            {isSaving ? "Menyimpan Perubahan..." : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    </div>
  );
}
