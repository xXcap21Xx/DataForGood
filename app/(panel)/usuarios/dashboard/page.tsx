import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import GraficaDeColumnas from "../../../../components/sistema/grafica-columnas";
import Subtabs from "../../../../components/sistema/subtabs";
import {
  Encabezado,
  Etiqueta,
  ListaClaveValor,
  Metrica,
  PieDePantalla,
  Reparto,
  TituloDeSeccion,
  formatearNumero,
} from "../../../../components/sistema/ui";
import styles from "../../../../components/sistema/ui.module.css";
import {
  PESTANAS_USUARIOS,
  formatearCorte,
  obtenerDashboardDeUsuarios,
  type RangoDeFechas,
} from "../../../../lib/usuarios/dashboard";
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
    <div className={styles.pad}>
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
            <Link className={styles.btn} href="/usuarios">
              Ver lista
            </Link>
          </>
        }
      />

      <div className={styles.g4} style={{ marginBottom: 24 }}>
        <Metrica etiqueta="Total registrados" valor={d.totalRegistrados} />
        <Metrica etiqueta="Altas del mes" valor={d.altasDelMes} />
        <Metrica etiqueta="Con aportes en el rango" valor={d.conAportesEnRango} />
        <Metrica etiqueta="Cuentas restringidas" valor={d.cuentasRestringidas} />
      </div>

      <TituloDeSeccion>Altas por mes</TituloDeSeccion>
      <div style={{ marginBottom: 26 }}>
        <GraficaDeColumnas
          columnas={d.altasPorMes}
          descripcion="Altas de usuarios por mes"
        />
      </div>

      <div className={styles.g2} style={{ marginBottom: 24 }}>
        <section>
          <TituloDeSeccion>Por rol asignado</TituloDeSeccion>
          <Reparto filas={d.porRol} />
          <p className={styles.tsub} style={{ marginTop: 10 }}>
            Un mismo usuario puede aparecer en más de una fila: crear campañas no
            excluye tener rol de revisor.
          </p>
        </section>

        <section>
          <TituloDeSeccion>Estado de la cuenta</TituloDeSeccion>
          <ListaClaveValor
            filas={[
              { clave: <Etiqueta tono="ok">Activas</Etiqueta>, valor: formatearNumero(e.activas) },
              {
                clave: <Etiqueta tono="aviso">Con strikes acumulados</Etiqueta>,
                valor: formatearNumero(e.conStrikes),
              },
              {
                clave: <Etiqueta tono="riesgo">Suspendidas</Etiqueta>,
                valor: formatearNumero(e.suspendidas),
              },
              {
                clave: <Etiqueta tono="riesgo">Baneadas</Etiqueta>,
                valor: formatearNumero(e.baneadas),
              },
              { clave: "Correo sin verificar", valor: formatearNumero(e.correoSinVerificar) },
            ]}
          />
        </section>
      </div>

      <div className={styles.g2} style={{ marginBottom: 24 }}>
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
      <div className={styles.tablaWrap}>
        <table className={styles.tabla}>
          <thead>
            <tr>
              <th style={{ width: "36%" }}>Usuario</th>
              <th style={{ width: "18%" }}>Aportes aprobados</th>
              <th style={{ width: "18%" }}>Campañas</th>
              <th style={{ width: "14%" }}>Estado</th>
              <th style={{ width: "14%" }} className={styles.tablaDerecha}>
                Ficha
              </th>
            </tr>
          </thead>
          <tbody>
            {d.masActivos.map((u) => (
              <tr key={u.id}>
                <td>
                  <div style={{ fontWeight: 500 }}>{u.nombre}</div>
                  <div className={`${styles.tsub} ${styles.mono}`}>{u.correo}</div>
                </td>
                <td className={styles.tablaNum}>{formatearNumero(u.aportesAprobados)}</td>
                <td className={styles.tablaNum}>{u.campanas}</td>
                <td>
                  <Etiqueta tono={u.estado.tono}>{u.estado.texto}</Etiqueta>
                </td>
                <td className={styles.tablaDerecha}>
                  <Link className={styles.btn} href={`/usuarios/${u.id}`}>
                    Abrir<span className={styles.srOnly}> la ficha de {u.nombre}</span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PieDePantalla
        volver={{ texto: "Panel del sistema", href: "/sistema" }}
        acciones={
          <Link className={styles.btn} href="/usuarios">
            Ver directorio completo
          </Link>
        }
      />
    </div>
  );
}
