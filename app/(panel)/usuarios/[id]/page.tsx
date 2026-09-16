import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Aviso,
  EnlaceBoton,
  Identidad,
  ListaClaveValor,
  MedidorDeStrikes,
  Tarjeta,
  TituloDeSeccion,
  Volver,
  formatearNumero,
} from "@/components/sistema/ui";
import { formatearFecha, obtenerUsuario } from "@/lib/usuarios/directorio";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const u = await obtenerUsuario(id);
  return { title: u ? u.nombre : "Usuario" };
}

export default async function FichaDeUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const u = await obtenerUsuario(id);
  if (!u) notFound();

  const baneado = u.estado === "BANEADA";
  const alLimite = u.strikes >= 2;

  return (
    <div>
      <Volver href="/usuarios">Volver al directorio</Volver>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <Identidad nombre={u.nombre} detalle={u.correo} riesgo={baneado} />
        <div className="flex flex-wrap items-center gap-2">
          <EnlaceBoton href={`/usuarios/${u.id}/roles`}>Cambiar rol</EnlaceBoton>
          <Link
            href={`/usuarios/${u.id}/sancion`}
            className="inline-flex items-center justify-center gap-1.5 rounded-pill border border-danger bg-surface px-3.5 py-1.5 text-[12.5px] font-semibold text-danger transition-colors hover:bg-danger-tint"
          >
            Sancionar
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <ListaClaveValor
            filas={[
              { clave: "Rol", valor: u.rol },
              { clave: "Ubicación", valor: u.ubicacion ?? "No declarada" },
              { clave: "Especialidad", valor: u.especialidad ?? "No declarada" },
              { clave: "Registro", valor: formatearFecha(u.registradoEn) },
              { clave: "Campañas creadas", valor: formatearNumero(u.campanasCreadas) },
              { clave: "Aportes enviados", valor: formatearNumero(u.aportesEnviados) },
            ]}
          />
        </section>

        <section>
          <TituloDeSeccion>Historial de sanciones</TituloDeSeccion>

          <MedidorDeStrikes acumulados={u.strikes} />
          <p className={`mb-3 text-[12px] ${u.strikes > 0 ? "text-warn" : "text-ink-3"}`}>
            {u.strikes} de 3 strikes acumulados
          </p>

          {u.historialDeStrikes.length === 0 ? (
            <p className="text-[13px] text-ink-2">Sin sanciones registradas.</p>
          ) : (
            <Tarjeta tenue>
              <ListaClaveValor
                filas={u.historialDeStrikes.map((s) => ({
                  clave: s.motivo,
                  valor: (
                    <span className="text-[12.5px] text-ink-3">
                      {formatearFecha(s.fecha)} · {s.campana}
                    </span>
                  ),
                }))}
              />
            </Tarjeta>
          )}

          {alLimite ? (
            <Aviso tono="aviso" className="mt-3">
              Un strike más activa el baneo permanente.
            </Aviso>
          ) : null}
        </section>
      </div>
    </div>
  );
}
