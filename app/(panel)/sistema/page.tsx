import type { Metadata } from "next";
import Link from "next/link";
import MetricCard from "@/components/sistema/MetricCard";
import { IconoCampanas } from "@/components/sistema/icons";
import { obtenerMetricasDelSistema } from "@/lib/sistema/metricas";

export const metadata: Metadata = { title: "Panel del sistema" };

export default async function PanelDelSistemaPage() {
  const m = await obtenerMetricasDelSistema();

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl font-extrabold text-ink">Panel del sistema</h1>
        <p className="mt-1 font-mono text-[13px] text-ink-2">
          Vista de solo lectura del estado global de la plataforma
        </p>
      </header>

      <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          label="Usuarios registrados"
          value={m.usuariosRegistrados}
          links={[
            { label: "Dashboard", href: "/usuarios/dashboard" },
            { label: "Lista", href: "/usuarios" },
          ]}
        />
        <MetricCard
          label="Campañas activas"
          value={m.campanasActivas}
          links={[{ label: "Dashboard", href: "/campanas/dashboard" }]}
        />
        <MetricCard
          label="Aportes recolectados"
          value={m.aportesRecolectados}
          links={[
            { label: "Dashboard", href: "/aportes/dashboard" },
            { label: "Lista", href: "/aportes" },
          ]}
        />
      </div>

      {m.haySupervisores ? null : (
        <section className="mb-6 flex items-start gap-3 rounded-lg border border-warn-tint bg-warn-tint p-5">
          <IconoCampanas className="mt-0.5 h-[18px] w-[18px] shrink-0 text-warn" />
          <div>
            <h2 className="mb-1 text-[14.5px] font-bold text-ink">
              Ningún usuario tiene el rol de Supervisor
            </h2>
            <p className="mb-3 text-[13px] leading-relaxed text-ink-2">
              Mientras no exista un supervisor, ninguna campaña puede pasar de
              «En revisión» a «Activa». Puedes promover al primero o validarlas
              tú mismo como respaldo.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/usuarios"
                className="rounded-pill border border-line-2 bg-surface px-3.5 py-1.5 text-[12.5px] font-semibold text-ink transition-colors hover:border-ink-3 hover:bg-sunken"
              >
                Asignar rol de Supervisor
              </Link>
              <Link
                href="/supervisar"
                className="rounded-pill border border-line-2 bg-surface px-3.5 py-1.5 text-[12.5px] font-semibold text-ink transition-colors hover:border-ink-3 hover:bg-sunken"
              >
                Validar como respaldo
              </Link>
            </div>
          </div>
        </section>
      )}

      <p className="rounded-lg bg-sunken p-4 text-[13px] leading-relaxed text-ink-2">
        En modo SuperUsuario todo es de consulta: se revisa el estado global, se
        gestionan roles y se aplican sanciones. Para pausar, finalizar o eliminar
        una campaña hay que entrar en{" "}
        <b className="font-semibold text-ink">Modo supervisor</b>.
      </p>
    </div>
  );
}
