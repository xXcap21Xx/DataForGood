import { currentUser } from "@/data/screensData";
import Button from "@/components/ui/Button";

export default function SupervisionPage() {
  if (currentUser.role !== "supervisor") {
    return (
      <div className="rounded-lg border border-line bg-surface p-8">
        <h1 className="text-2xl font-extrabold text-ink">Acceso restringido</h1>
        <p className="mt-2 text-[13px] text-ink-2">
          Esta sección solo está disponible para usuarios con rol de supervisor.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
            Supervisión
          </p>
          <h1 className="mt-2 text-2xl font-extrabold text-ink">
            Panel de supervisión
          </h1>
          <p className="mt-1 text-[13px] text-ink-2">
            Revisión de campañas, aportes y observaciones del ecosistema.
          </p>
        </div>
        <Button variant="primary" size="sm">
          Crear revisión
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded-lg border border-line bg-surface p-5">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
            Campañas
          </p>
          <div className="mt-3 flex items-end justify-between">
            <span className="text-4xl font-extrabold text-ink">12</span>
            <span className="rounded-pill bg-ok-tint px-3 py-1 text-[11px] font-bold text-ok">
              Activas
            </span>
          </div>
          <p className="mt-3 text-[12.5px] text-ink-2">4 en revisión · 2 pausadas</p>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
            Aportes
          </p>
          <div className="mt-3 flex items-end justify-between">
            <span className="text-4xl font-extrabold text-ink">48</span>
            <span className="rounded-pill bg-warn-tint px-3 py-1 text-[11px] font-bold text-warn">
              Pendientes
            </span>
          </div>
          <p className="mt-3 text-[12.5px] text-ink-2">9 rechazados · 16 aceptados</p>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
            Observaciones
          </p>
          <div className="mt-3 flex items-end justify-between">
            <span className="text-4xl font-extrabold text-ink">07</span>
            <span className="rounded-pill bg-accent-tint px-3 py-1 text-[11px] font-bold text-accent">
              Abiertas
            </span>
          </div>
          <p className="mt-3 text-[12.5px] text-ink-2">3 requieren respuesta</p>
        </section>
      </div>

      <section className="rounded-lg border border-line bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
              Cola de revisión
            </p>
            <h2 className="mt-1 text-lg font-extrabold text-ink">
              Solicitudes recientes
            </h2>
          </div>
          <Button variant="secondary" size="sm">
            Ver todo
          </Button>
        </div>

        <div className="space-y-3">
          {[
            ["Censo de árboles urbanos", "Campaña", "Pendiente de aprobación"],
            ["Mapa de bancas públicas", "Campaña", "Observaciones pendientes"],
            ["Aporte #3121", "Aporte", "Esperando validación"],
          ].map(([title, type, state]) => (
            <div className="flex items-center justify-between rounded border border-line bg-sunken px-4 py-3">
              <div>
                <p className="text-sm font-bold text-ink">{title}</p>
                <p className="text-[12px] text-ink-2">{type}</p>
              </div>
              <span className="rounded-pill border border-line-2 bg-surface px-3 py-1 text-[11px] font-bold text-ink-2">
                {state}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
