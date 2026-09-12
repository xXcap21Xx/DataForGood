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

  const roleLabel = ROLE_LABELS[currentUser.role] ?? currentUser.role;

  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
            Cuenta
          </p>
          <h1 className="mt-2 text-2xl font-extrabold text-ink">
            Configuración de cuenta
          </h1>
          <p className="mt-1 text-[13px] text-ink-2">
            Gestiona tus datos, preferencias y acceso a la plataforma.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm">
            Guardar cambios
          </Button>
        </div>
      </div>

      <section className="rounded-lg border border-line bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-lg font-extrabold text-white">
              {(currentUser.nombre ?? "")
                .split(" ")
                .map((p) => p[0])
                .join("")
                .slice(0, 2)}
            </div>
            <div>
              <p className="text-lg font-extrabold text-ink">{`${currentUser.nombre ?? ""} ${currentUser.apellidos ?? ""}`.trim()}</p>
              <p className="text-[13px] text-ink-2">{currentUser.email}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-pill border border-line-2 bg-sunken px-3 py-1 text-[11px] font-semibold text-ink-2">
                  {roleLabel}
                </span>
                <span className="rounded-pill border border-ok/30 bg-ok-tint px-3 py-1 text-[11px] font-semibold text-ok">
                  Nivel {currentUser.level}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm">
              Cambiar foto
            </Button>
            <Button variant="danger" size="sm">
              Eliminar cuenta
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-line bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
                Perfil
              </p>
              <h2 className="mt-1 text-lg font-extrabold text-ink">
                Datos personales
              </h2>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-ink">
                Nombre visible
              </label>
              <input
                readOnly
                value={`${currentUser.nombre ?? ""} ${currentUser.apellidos ?? ""}`.trim()}
                className="w-full rounded border border-line-2 bg-surface px-3.5 py-3 text-sm text-ink outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-ink">
                Correo electrónico
              </label>
              <input
                readOnly
                value={currentUser.email}
                className="w-full rounded border border-line-2 bg-surface px-3.5 py-3 text-sm text-ink outline-none"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-ink">
                  Estado
                </label>
                <input
                  readOnly
                  value={currentUser.state || "No especificado"}
                  className="w-full rounded border border-line-2 bg-surface px-3.5 py-3 text-sm text-ink outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-ink">
                  Ciudad
                </label>
                <input
                  readOnly
                  value={currentUser.city || "No especificado"}
                  className="w-full rounded border border-line-2 bg-surface px-3.5 py-3 text-sm text-ink outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-ink">
                Especialidad
              </label>
              <input
                readOnly
                value={currentUser.specialty || "Sin especialidad"}
                className="w-full rounded border border-line-2 bg-surface px-3.5 py-3 text-sm text-ink outline-none"
              />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
                Seguridad
              </p>
              <h2 className="mt-1 text-lg font-extrabold text-ink">
                Acceso y privacidad
              </h2>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded border border-line bg-sunken p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-ink">Contraseña</p>
                  <p className="text-[12.5px] text-ink-2">
                    {currentUser.tiene_contrasena
                      ? "Inicia sesión con tu correo y contraseña"
                      : "Esta cuenta inicia sesión con Google"}
                  </p>
                </div>
                <Button variant="secondary" size="sm" disabled={!currentUser.tiene_contrasena}>
                  Cambiar
                </Button>
              </div>
            </div>

            <div className="rounded border border-line bg-sunken p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-ink">Verificación</p>
                  <p className="text-[12.5px] text-ink-2">
                    {currentUser.email_verificado ? "Correo confirmado" : "Correo sin confirmar"}
                  </p>
                </div>
                {currentUser.email_verificado ? (
                  <span className="rounded-pill border border-ok/30 bg-ok-tint px-3 py-1 text-[11px] font-bold text-ok">
                    Activa
                  </span>
                ) : (
                  <span className="rounded-pill border border-warn/30 bg-warn-tint px-3 py-1 text-[11px] font-bold text-warn">
                    Pendiente
                  </span>
                )}
              </div>
            </div>

            <div className="rounded border border-line bg-sunken p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-ink">Privacidad</p>
                  <p className="text-[12.5px] text-ink-2">
                    Participación visible en comunidad
                  </p>
                </div>
                <button className="relative h-6 w-11 rounded-pill bg-accent">
                  <span className="absolute right-1 top-1 h-4 w-4 rounded-full bg-white" />
                </button>
              </div>
            </div>

            <div className="rounded border border-line bg-sunken p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-ink">Sesión</p>
                  <p className="text-[12.5px] text-ink-2">Cierra tu sesión en este dispositivo</p>
                </div>
                <LogoutButton />
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-line bg-surface p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
              Mis intereses
            </p>
            <h2 className="mt-1 text-lg font-extrabold text-ink">
              Temáticas que guían tus aportes
            </h2>
          </div>
          <button className="rounded-pill border border-accent bg-accent px-4 py-2 text-[12px] font-bold text-white transition-colors hover:bg-accent-deep">
            Agregar etiqueta
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {currentUser.intereses.length === 0 ? (
            <p className="text-[12.5px] text-ink-2">
              Todavía no seleccionas ningún interés.
            </p>
          ) : (
            currentUser.intereses.map((interest) => (
              <span
                key={interest}
                className="inline-flex items-center gap-2 rounded-pill border border-accent bg-accent px-4 py-2 text-[12px] font-bold text-white"
              >
                {interest}
                <span className="font-mono text-[11px]">×</span>
              </span>
            ))
          )}
        </div>
        <p className="mt-3 text-[12.5px] text-ink-2">
          Determinan qué campañas aparecen en “Sugeridas para ti”.
        </p>
      </section>

      <section className="rounded-lg border border-line bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
              Progreso y logros
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[14px] text-ink-2">
              <span className="text-ink font-extrabold text-base">
                Nivel {currentUser.level}
              </span>
              <span className="text-ink-2">
                · {currentUser.xp_total.toLocaleString("es-MX")} XP
              </span>
              <span className="text-ink-2">
                · racha de {currentUser.streak_days} días
              </span>
            </div>
          </div>
          <button className="rounded-pill border border-line-2 bg-surface px-5 py-2 text-[13px] font-bold text-ink transition-colors hover:border-accent hover:text-accent">
            Ver
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-surface p-5">
        <div className="mb-4">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
            Preferencias
          </p>
          <h2 className="mt-1 text-lg font-extrabold text-ink">
            Comunicación y notificaciones
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded border border-line-2 bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">Campañas nuevas</span>
              <span className="h-4 w-4 rounded-full bg-ok" />
            </div>
            <p className="mt-2 text-[12px] text-ink-2">Recibir alertas</p>
          </div>
          <div className="rounded border border-line-2 bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">Aportes</span>
              <span className="h-4 w-4 rounded-full bg-ok" />
            </div>
            <p className="mt-2 text-[12px] text-ink-2">Estado actualizado</p>
          </div>
          <div className="rounded border border-line-2 bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">Recordatorios</span>
              <span className="h-4 w-4 rounded-full bg-line-2" />
            </div>
            <p className="mt-2 text-[12px] text-ink-2">Semanal</p>
          </div>
          <div className="rounded border border-line-2 bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">Newsletter</span>
              <span className="h-4 w-4 rounded-full bg-ok" />
            </div>
            <p className="mt-2 text-[12px] text-ink-2">Resumen mensual</p>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link href="/mis-aportes">
          <Button variant="ghost" size="sm">
            Volver a aportes
          </Button>
        </Link>
        <Button variant="primary" size="sm">
          Guardar configuración
        </Button>
      </div>
    </div>
  );
}
