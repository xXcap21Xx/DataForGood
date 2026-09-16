import type { Metadata } from "next";

import Subtabs from "@/components/sistema/subtabs";
import { Aviso, Encabezado } from "@/components/sistema/ui";
import Tag from "@/components/sistema/Tag";
import { PESTANAS_USUARIOS } from "@/lib/usuarios/dashboard";
import { formatearFecha, listarSancionesActivas } from "@/lib/usuarios/directorio";
import BotonRestaurar from "./boton-restaurar";

export const metadata: Metadata = { title: "Sanciones" };
export const dynamic = "force-dynamic";

export default async function SancionesPage() {
  const sanciones = await listarSancionesActivas();

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
    </div>
  );
}
