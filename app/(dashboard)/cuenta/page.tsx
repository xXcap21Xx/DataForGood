import Link from "next/link";
import { redirect } from "next/navigation";
import Button from "@/components/ui/Button";
import LogoutButton from "@/components/auth/LogoutButton";
import { getSessionUser } from "@/lib/session";

const ROLE_LABELS: Record<string, string> = {
  usuario: "Usuario común",
  revisor: "Revisor de aportes",
  supervisor: "Supervisor",
  admin: "SuperUsuario",
};

export default async function CuentaPage() {
  const currentUser = await getSessionUser();

  if (!currentUser) {
    redirect("/entrar");
  }

  const roleValue = Array.isArray(currentUser.role) ? currentUser.role[0] ?? "usuario" : currentUser.role;
  const roleLabel = ROLE_LABELS[roleValue] ?? roleValue;

  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">Cuenta</p>
          <h1 className="mt-2 text-2xl font-extrabold text-ink">Configuración de cuenta</h1>
          <p className="mt-1 text-[13px] text-ink-2">Gestiona tus datos, preferencias y acceso a la plataforma.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm">Guardar cambios</Button>
        </div>
      </div>
    </div>
  );
}
