import { Navigate } from "@tanstack/react-router";
import { canAccessRole, type UserRole, useAuth } from "@/lib/auth-store";

export function RoleGuard({
  allowedRoles,
  children,
}: {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}) {
  const { isReady, session } = useAuth();

  if (!isReady) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-3xl border border-border bg-card">
        <div className="text-center">
          <div className="text-sm font-medium text-foreground">Memuat akses...</div>
          <div className="mt-1 text-xs text-muted-foreground">Menyiapkan sesi pengguna.</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" />;
  }

  if (!canAccessRole(session.role, allowedRoles)) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}
