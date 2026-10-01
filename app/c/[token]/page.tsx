// Pantalla /c/[token] (pública): a donde lleva el enlace o el QR que comparte el creador.
// Server Component. Datos: buscarEnlacePorToken() de lib/campanas/enlaces.ts; cada
// apertura de un enlace vigente suma una visita (registrarVisita).
// Si el enlace sirve y la campaña está activa, invita a aportar: con sesión va a
// /campanas/[id]/aportar?enlace=<token>; sin ella, a /entrar o /registro con ?next=.
// El aporte anónimo (sin cuenta) todavía no existe: es un punto abierto de dominio.md.

import type { Metadata } from "next";
import type { ReactNode } from "react";
import PublicFooter from "@/components/layout/PublicFooter";
import PublicHeader from "@/components/layout/PublicHeader";
import ButtonLink from "@/components/ui/ButtonLink";
import Card from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";
import Tag from "@/components/ui/Tag";
import { buscarEnlacePorToken, registrarVisita, type CampanaDelEnlace } from "@/lib/campanas/enlaces";
import { conDestino } from "@/lib/redireccion";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Participa en una campaña · DataForGood",
  // El token es un acceso temporal: que no lo indexen los buscadores.
  robots: { index: false, follow: false },
};

const numero = new Intl.NumberFormat("es-MX");
// fechaFin viene como "AAAA-MM-DD" (DATE sin hora): se formatea en UTC para no correr el día.
const fecha = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default async function EnlacePublicoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const resultado = await buscarEnlacePorToken(token.toLowerCase());

  let contenido: ReactNode;
  if (resultado.tipo === "inexistente") {
    contenido = <Aviso titulo="Enlace no válido" texto="Esta dirección no corresponde a ninguna campaña. Revisa que la hayas copiado completa." />;
  } else if (resultado.tipo === "revocado") {
    contenido = (
      <Aviso
        titulo="Este enlace ya no funciona"
        texto="Quien organiza la campaña generó un enlace nuevo. Pídele la dirección actualizada o busca la campaña en Explorar."
        explorar
      />
    );
  } else if (resultado.tipo === "caducado") {
    contenido = (
      <Aviso
        titulo="Este enlace caducó"
        texto="Los enlaces para participar valen un tiempo limitado. Pide uno nuevo a quien organiza la campaña o búscala en Explorar."
        explorar
      />
    );
  } else if (resultado.campana.status !== "activa") {
    contenido = (
      <Aviso
        titulo={resultado.campana.nombre}
        texto="Esta campaña ya no está recibiendo aportes."
        explorar
      />
    );
  } else {
    await registrarVisita(resultado.enlace.id);
    const usuario = await getSessionUser();
    contenido = <Invitacion campana={resultado.campana} token={resultado.enlace.token} conSesion={usuario !== null} />;
  }

  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader />
      <main className="mx-auto max-w-xl px-6 pb-24 pt-14 max-md:px-4 max-md:pt-8">{contenido}</main>
      <PublicFooter />
    </div>
  );
}

function Invitacion({ campana, token, conSesion }: { campana: CampanaDelEnlace; token: string; conSesion: boolean }) {
  const pct = campana.meta ? Math.min(100, Math.round((campana.aportesActuales / campana.meta) * 100)) : 0;
  const lugar = [campana.ciudad, campana.estado].filter(Boolean).join(", ");
  const aportar = `/campanas/${campana.id}/aportar?enlace=${token}`;

  return (
    <>
      <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-accent">Te invitaron a participar</p>
      <Card>
        <div className="mb-1 flex items-start justify-between gap-2">
          <h1 className="text-xl font-extrabold text-ink">{campana.nombre}</h1>
          <Tag tone="ok">Activa</Tag>
        </div>
        <p className="text-[12.5px] text-ink-2">
          {campana.organizador || "Sin organización"}
          {lugar ? ` · ${lugar}` : ""}
        </p>
        <p className="mt-3 text-[13.5px] leading-relaxed text-ink-2">{campana.descripcion}</p>
        {campana.tematica && (
          <div className="mt-3">
            <Tag>{campana.tematica}</Tag>
          </div>
        )}
        <div className="mt-4">
          <ProgressBar pct={pct} tone="ok" />
          <p className="mt-2 font-mono text-[11px] text-ink-3">
            {numero.format(campana.aportesActuales)} de {numero.format(campana.meta)} aportes · hasta{" "}
            {numero.format(campana.cuotaPorPersona)} por persona
            {campana.fechaFin ? ` · cierra el ${fecha.format(new Date(`${campana.fechaFin}T00:00:00Z`))}` : ""}
          </p>
        </div>
      </Card>

      <div className="mt-5 flex flex-col gap-2.5">
        {conSesion ? (
          <ButtonLink href={aportar} variant="primary" className="w-full">
            Aportar a esta campaña
          </ButtonLink>
        ) : (
          <>
            <ButtonLink href={conDestino("/entrar", aportar)} variant="primary" className="w-full">
              Inicia sesión para aportar
            </ButtonLink>
            <ButtonLink href={conDestino("/registro", aportar)} className="w-full">
              Crear una cuenta
            </ButtonLink>
            <p className="text-center text-[12px] text-ink-3">
              Necesitas una cuenta para aportar. Al terminar volverás a esta campaña.
            </p>
          </>
        )}
      </div>
    </>
  );
}

function Aviso({ titulo, texto, explorar = false }: { titulo: string; texto: string; explorar?: boolean }) {
  return (
    <Card>
      <h1 className="mb-2 text-xl font-extrabold text-ink">{titulo}</h1>
      <p className="text-[13.5px] text-ink-2">{texto}</p>
      {explorar && (
        <ButtonLink href="/explorar" className="mt-4">
          Ver campañas activas
        </ButtonLink>
      )}
    </Card>
  );
}
