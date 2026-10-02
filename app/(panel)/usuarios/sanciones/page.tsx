// Pantalla /usuarios/sanciones: sanciones activas de cuentas y bloqueos globales de
// dispositivos anónimos.
// Server Component. Datos: listarSancionesActivas() y listarBloqueosGlobales()
// (lib/aportes/sanciones-anonimas.ts). Acciones: boton-restaurar.tsx y boton-quitar-bloqueo.tsx.

import type { Metadata } from "next";

import Subtabs from "@/components/sistema/subtabs";
import { Aviso, Encabezado } from "@/components/sistema/ui";
import Tag from "@/components/sistema/Tag";
import { PESTANAS_USUARIOS } from "@/lib/usuarios/dashboard";
import { formatearFecha, listarSancionesActivas } from "@/lib/usuarios/directorio";
import BotonRestaurar from "./boton-restaurar";
import BotonQuitarBloqueo from "./boton-quitar-bloqueo";
import { DIAS_DE_BLOQUEO, INAPROPIADOS_PARA_BLOQUEO, VENTANA_DE_DIAS, listarBloqueosGlobales } from "@/lib/aportes/sanciones-anonimas";

export const metadata: Metadata = { title: "Sanciones" };
export const dynamic = "force-dynamic";

export default async function SancionesPage() {
  const [sanciones, bloqueos] = await Promise.all([listarSancionesActivas(), listarBloqueosGlobales()]);

  return (
    <div>
      <Subtabs pestanas={PESTANAS_USUARIOS} etiquetaAria="Secciones de usuarios" />

      <Encabezado
        titulo="Sanciones activas"
        subtitulo={`${sanciones.length} cuentas con restricción vigente`}
      />

      {sanciones.length === 0 ? (
        <p className="py-7 text-[13px] text-ink-2">No hay restricciones vigentes.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface p-5 shadow-sm">
          <table className="w-full min-w-[640px] text-left text-[13.5px]">
            <thead className="border-b border-line font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
              <tr>
                <th className="pb-3 font-medium">Usuario</th>
                <th className="pb-3 font-medium">Sanción</th>
                <th className="pb-3 font-medium">Motivo</th>
                <th className="pb-3 text-right font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {sanciones.map((s) => (
                <tr key={s.id} className="border-b border-line last:border-0">
                  <td className="py-4">
                    <p className="font-bold text-ink">{s.usuario}</p>
                    <p className="font-mono text-[11px] text-ink-3">
                      desde {formatearFecha(s.desde)}
                    </p>
                  </td>
                  <td>
                    <Tag tone={s.tono}>{s.etiqueta}</Tag>
                  </td>
                  <td className="text-ink-2">{s.motivo}</td>
                  <td className="text-right">
                    <BotonRestaurar sancionId={s.id} usuario={s.usuario} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Aviso tono="neutro" className="mt-5">
        Restaurar el acceso no borra el historial de strikes: el contador se
        conserva para la escala de penalización.
      </Aviso>

      <h2 className="mb-1 mt-10 text-[17px] font-extrabold text-ink">Dispositivos anónimos bloqueados</h2>
      <p className="mb-4 text-[13px] text-ink-2">
        Personas sin cuenta con {INAPROPIADOS_PARA_BLOQUEO} aportes marcados como inapropiados en{" "}
        {VENTANA_DE_DIAS} días. No pueden aportar sin cuenta en ninguna campaña, desde ese
        dispositivo ni desde su red, durante {DIAS_DE_BLOQUEO} días.
      </p>
      {bloqueos.length === 0 ? (
        <p className="py-4 text-[13px] text-ink-2">No hay dispositivos bloqueados.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface p-5 shadow-sm">
          <table className="w-full min-w-[640px] text-left text-[13.5px]">
            <thead className="border-b border-line font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
              <tr>
                <th className="pb-3 font-medium">Dispositivo</th>
                <th className="pb-3 font-medium">Motivo</th>
                <th className="pb-3 font-medium">Vence</th>
                <th className="pb-3 text-right font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {bloqueos.map((b) => (
                <tr key={b.id} className="border-b border-line last:border-0">
                  <td className="py-4">
                    <p className="font-bold text-ink">Anónimo #{b.id}</p>
                    <p className="font-mono text-[11px] text-ink-3">
                      desde {formatearFecha(b.desde)}
                      {b.campana ? ` · ${b.campana}` : ""}
                    </p>
                  </td>
                  <td className="text-ink-2">{b.motivo}</td>
                  <td className="font-mono text-[12px] text-ink-2">{b.hasta ? formatearFecha(b.hasta) : "Sin fecha"}</td>
                  <td className="text-right">
                    <BotonQuitarBloqueo bloqueoId={b.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
