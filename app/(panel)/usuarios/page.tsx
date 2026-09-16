import type { Metadata } from "next";
import { Suspense } from "react";

import Subtabs from "@/components/sistema/subtabs";
import { Encabezado, EnlaceBoton, Paginacion, formatearNumero } from "@/components/sistema/ui";
import Tag from "@/components/sistema/Tag";
import { PESTANAS_USUARIOS } from "@/lib/usuarios/dashboard";
import { ETIQUETA_DE_ESTADO, POR_PAGINA, buscarUsuarios } from "@/lib/usuarios/directorio";
import Filtros from "./filtros";

export const metadata: Metadata = { title: "Directorio de usuarios" };
export const dynamic = "force-dynamic";

type Busqueda = { q?: string; rol?: string; estado?: string; pagina?: string };

export default async function DirectorioPage({
  searchParams,
}: {
  searchParams: Promise<Busqueda>;
}) {
  const sp = await searchParams;
  const pagina = Math.max(1, Number(sp.pagina ?? 1) || 1);

  const { filas, total } = await buscarUsuarios({
    q: sp.q,
    rol: sp.rol,
    estado: sp.estado,
    pagina,
  });

  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const desde = (pagina - 1) * POR_PAGINA + 1;
  const hasta = Math.min(pagina * POR_PAGINA, total);

  function enlaceDePagina(p: number) {
    const params = new URLSearchParams();
    if (sp.q) params.set("q", sp.q);
    if (sp.rol) params.set("rol", sp.rol);
    if (sp.estado) params.set("estado", sp.estado);
    if (p > 1) params.set("pagina", String(p));
    const qs = params.toString();
    return qs ? `/usuarios?${qs}` : "/usuarios";
  }

  return (
    <div>
      <Subtabs pestanas={PESTANAS_USUARIOS} etiquetaAria="Secciones de usuarios" />

      <Encabezado
        titulo="Usuarios"
        subtitulo={`${formatearNumero(total)} registrados`}
        acciones={<EnlaceBoton href="/usuarios/dashboard">Ver dashboard</EnlaceBoton>}
      />

      <Suspense fallback={null}>
        <Filtros q={sp.q ?? ""} rol={sp.rol ?? ""} estado={sp.estado ?? ""} />
      </Suspense>

      {filas.length === 0 ? (
        <p className="py-7 text-[13px] text-ink-2">
          Ningún usuario coincide con la búsqueda. Prueba con otro término o quita
          alguno de los filtros.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-line bg-surface p-5 shadow-sm">
            <table className="w-full min-w-[720px] text-left text-[13.5px]">
              <thead className="border-b border-line font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
                <tr>
                  <th className="pb-3 font-medium">Usuario</th>
                  <th className="pb-3 font-medium">Rol</th>
                  <th className="pb-3 font-medium">Estado</th>
                  <th className="pb-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((u) => {
                  const estado = ETIQUETA_DE_ESTADO[u.estado];
                  return (
                    <tr key={u.id} className="border-b border-line last:border-0">
                      <td className="py-4">
                        <p className="font-bold text-ink">{u.nombre}</p>
                        <p className="font-mono text-[11px] text-ink-3">{u.correo}</p>
                      </td>
                      <td className="text-ink-2">
                        {u.rol}
                        {u.rolDetalle ? (
                          <span className="text-ink-3"> {u.rolDetalle}</span>
                        ) : null}
                      </td>
                      <td>
                        <Tag tone={estado.tono}>
                          {u.estado === "CON_STRIKES" ? `${u.strikes} strikes` : estado.texto}
                        </Tag>
                      </td>
                      <td className="text-right">
                        <EnlaceBoton href={`/usuarios/${u.id}`}>
                          Abrir<span className="sr-only"> la ficha de {u.nombre}</span>
                        </EnlaceBoton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Paginacion
            desde={desde}
            hasta={hasta}
            total={total}
            pagina={pagina}
            paginas={paginas}
            href={enlaceDePagina}
          />
        </>
      )}
    </div>
  );
}
