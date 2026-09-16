import type { Metadata } from "next";
import { Suspense } from "react";

import GraficaDeColumnas from "@/components/sistema/grafica-columnas";
import Subtabs from "@/components/sistema/subtabs";
import {
  Encabezado,
  EnlaceBoton,
  ListaClaveValor,
  PieDePantalla,
  Reparto,
  TituloDeSeccion,
  formatearNumero,
} from "@/components/sistema/ui";
import MetricCard from "@/components/sistema/MetricCard";
import Tag from "@/components/sistema/Tag";
import {
  PESTANAS_USUARIOS,
  formatearCorte,
  obtenerDashboardDeUsuarios,
  type RangoDeFechas,
} from "@/lib/usuarios/dashboard";
import SelectorDeRango from "./selector-de-rango";

export const metadata: Metadata = { title: "Dashboard de usuarios" };
export const dynamic = "force-dynamic";

const RANGOS: RangoDeFechas[] = ["30d", "90d", "12m"];

function normalizarRango(valor?: string): RangoDeFechas {
  return RANGOS.includes(valor as RangoDeFechas) ? (valor as RangoDeFechas) : "30d";
}

export default async function DashboardDeUsuariosPage({
  searchParams,
}: {
  // En Next 16 searchParams llega como promesa.
  searchParams: Promise<{ rango?: string }>;
}) {
  const { rango } = await searchParams;
  const activo = normalizarRango(rango);
  const d = await obtenerDashboardDeUsuarios(activo);

  const e = d.estadoDeCuenta;

  return (
    <div>
      <Subtabs pestanas={PESTANAS_USUARIOS} etiquetaAria="Secciones de usuarios" />

      <Encabezado
        titulo="Usuarios registrados"
        subtitulo={formatearCorte(d.cortadoEn)}
        subtituloMono
        acciones={
          <>
            <Suspense fallback={null}>
              <SelectorDeRango valor={activo} />
            </Suspense>
            <EnlaceBoton href="/usuarios">Ver lista</EnlaceBoton>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total registrados" value={formatearNumero(d.totalRegistrados)} />
        <MetricCard label="Altas del mes" value={formatearNumero(d.altasDelMes)} />
        <MetricCard label="Con aportes en el rango" value={formatearNumero(d.conAportesEnRango)} />
        <MetricCard label="Cuentas restringidas" value={formatearNumero(d.cuentasRestringidas)} />
      </div>

      <TituloDeSeccion>Altas por mes</TituloDeSeccion>
      <div className="mb-6">
        <GraficaDeColumnas columnas={d.altasPorMes} descripcion="Altas de usuarios por mes" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section>
          <TituloDeSeccion>Por rol asignado</TituloDeSeccion>
          <Reparto filas={d.porRol} />
          <p className="mt-2.5 text-[12.5px] text-ink-3">
            Un mismo usuario puede aparecer en más de una fila: crear campañas no
            excluye tener rol de revisor.
          </p>
        </section>

        <section>
          <TituloDeSeccion>Estado de la cuenta</TituloDeSeccion>
          <ListaClaveValor
            filas={[
              { clave: <Tag tone="ok">Activas</Tag>, valor: formatearNumero(e.activas) },
              {
                clave: <Tag tone="warn">Con strikes acumulados</Tag>,
                valor: formatearNumero(e.conStrikes),
              },
              {
                clave: <Tag tone="danger">Suspendidas</Tag>,
                valor: formatearNumero(e.suspendidas),
              },
              {
                clave: <Tag tone="danger">Baneadas</Tag>,
                valor: formatearNumero(e.baneadas),
              },
              { clave: "Correo sin verificar", valor: formatearNumero(e.correoSinVerificar) },
            ]}
          />
        </section>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section>
          <TituloDeSeccion>Temáticas de interés declaradas</TituloDeSeccion>
          <Reparto
            anchoEtiqueta={110}
            anchoValor={38}
            maximo={100}
            filas={d.interesesDeclarados.map((i) => ({
              etiqueta: i.etiqueta,
              valor: i.porcentaje,
              display: `${i.porcentaje}%`,
            }))}
          />
        </section>

        <section>
          <TituloDeSeccion>Por ubicación</TituloDeSeccion>
          <ListaClaveValor
            filas={d.porUbicacion.map((u) => ({
              clave: u.etiqueta,
              valor: formatearNumero(u.valor),
            }))}
          />
        </section>
      </div>

      <TituloDeSeccion>Usuarios con mayor participación</TituloDeSeccion>
      <div className="overflow-x-auto rounded-lg border border-line bg-surface p-5 shadow-sm">
        <table className="w-full min-w-[640px] text-left text-[13.5px]">
          <thead className="border-b border-line font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
            <tr>
              <th className="pb-3 font-medium">Usuario</th>
              <th className="pb-3 font-medium">Aportes aprobados</th>
              <th className="pb-3 font-medium">Campañas</th>
              <th className="pb-3 font-medium">Estado</th>
              <th className="pb-3 text-right font-medium">Ficha</th>
            </tr>
          </thead>
          <tbody>
            {d.masActivos.map((u) => (
              <tr key={u.id} className="border-b border-line last:border-0">
                <td className="py-4">
                  <p className="font-bold text-ink">{u.nombre}</p>
                  <p className="font-mono text-[11px] text-ink-3">{u.correo}</p>
                </td>
                <td className="font-mono tabular-nums">{formatearNumero(u.aportesAprobados)}</td>
                <td className="font-mono tabular-nums">{u.campanas}</td>
                <td>
                  <Tag tone={u.estado.tono}>{u.estado.texto}</Tag>
                </td>
                <td className="text-right">
                  <EnlaceBoton href={`/usuarios/${u.id}`}>
                    Abrir<span className="sr-only"> la ficha de {u.nombre}</span>
                  </EnlaceBoton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PieDePantalla
        volver={{ texto: "Panel del sistema", href: "/sistema" }}
        acciones={<EnlaceBoton href="/usuarios">Ver directorio completo</EnlaceBoton>}
      />
    </div>
  );
}
