import { Navigate, createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth-store";

export const Route = createFileRoute("/_app")({
  component: ProtectedAppShell,
});

function ProtectedAppShell() {
  const { isReady, session } = useAuth();

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <div className="text-base font-semibold text-foreground">Memuat aplikasi...</div>
          <div className="mt-2 text-sm text-muted-foreground">Menyiapkan sesi pengguna.</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" />;
  }

  return <AppShell />;
}
