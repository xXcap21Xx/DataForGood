import type { Metadata } from "next";
import { Suspense } from "react";

import Subtabs from "@/components/sistema/subtabs";
import { Aviso, Encabezado, EnlaceBoton, formatearNumero } from "@/components/sistema/ui";
import MetricCard from "@/components/sistema/MetricCard";
import { PESTANAS_USUARIOS } from "@/lib/usuarios/dashboard";
import {
  formatearFechaHoraSup,
  formatearFechaSup,
  listarSupervisores,
  obtenerResumenDeSupervisores,
} from "@/lib/usuarios/supervisores";
import BuscadorDeSupervisores from "./buscador";

export const metadata: Metadata = { title: "Supervisores" };
export const dynamic = "force-dynamic";

export default async function SupervisoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const [resumen, supervisores] = await Promise.all([
    obtenerResumenDeSupervisores(),
    listarSupervisores(q),
  ]);

  return (
    <div>
      <Subtabs pestanas={PESTANAS_USUARIOS} etiquetaAria="Secciones de usuarios" />

      <Encabezado
        titulo="Supervisores"
        subtitulo={`${resumen.conRolActivo} con el rol activo · ${resumen.accionesEjecutadas} acciones en los últimos 30 días`}
        acciones={
          <Suspense fallback={null}>
            <BuscadorDeSupervisores q={q ?? ""} />
          </Suspense>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Con rol activo" value={formatearNumero(resumen.conRolActivo)} />
        <MetricCard label="Campañas a su cargo" value={formatearNumero(resumen.campanasACargo)} />
        <MetricCard label="Acciones ejecutadas" value={formatearNumero(resumen.accionesEjecutadas)} />
        <MetricCard label="Acciones revertidas" value={formatearNumero(resumen.accionesRevertidas)} />
      </div>

      {supervisores.length === 0 ? (
        <p className="py-7 text-[13px] text-ink-2">Ningún supervisor coincide con la búsqueda.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface p-5 shadow-sm">
          <table className="w-full min-w-[720px] text-left text-[13.5px]">
            <thead className="border-b border-line font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
              <tr>
                <th className="pb-3 font-medium">Supervisor</th>
                <th className="pb-3 font-medium">Campañas</th>
                <th className="pb-3 font-medium">Aportes validados</th>
                <th className="pb-3 font-medium">Acciones</th>
                <th className="pb-3 font-medium">Última actividad</th>
                <th className="pb-3 text-right font-medium">Actividad</th>
              </tr>
            </thead>
            <tbody>
              {supervisores.map((s) => (
                <tr key={s.id} className="border-b border-line last:border-0">
                  <td className="py-4">
                    <p className="font-bold text-ink">{s.nombre}</p>
                    <p className="font-mono text-[11px] text-ink-3">
                      Supervisor desde {formatearFechaSup(s.desde)}
                    </p>
                  </td>
                  <td className="font-mono tabular-nums">{s.campanasACargo}</td>
                  <td className="font-mono tabular-nums">{formatearNumero(s.aportesValidados)}</td>
                  <td className="font-mono tabular-nums">{s.accionesEnRango}</td>
                  <td className="font-mono text-[11px] text-ink-3">
                    {formatearFechaHoraSup(s.ultimaActividad)}
                  </td>
                  <td className="text-right">
                    <EnlaceBoton href={`/usuarios/supervisores/${s.id}`}>
                      Ver<span className="sr-only"> la actividad de {s.nombre}</span>
                    </EnlaceBoton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Aviso tono="neutro" className="mt-5">
        Abre a un supervisor para ver qué campañas lleva y el historial de lo que ha
        decidido. Revertir una de esas decisiones es potestad exclusiva del
        SuperUsuario y exige motivo registrado.
      </Aviso>
    </div>
  );
}
