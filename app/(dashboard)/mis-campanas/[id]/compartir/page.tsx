"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Button from "@/components/ui/Button";
import Tag from "@/components/ui/Tag";
import type { Campaign } from "@/types";

export default function CompartirCampanaPage() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [expired, setExpired] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadCampaign() {
      const response = await fetch(`/api/campanas?id=${id}`);
      if (!response.ok) return;
      const body = await response.json();
      setCampaign(body.data ?? null);
    }

    if (id) loadCampaign();
  }, [id]);

  if (!campaign) {
    return <p className="text-sm text-ink-2">Cargando campaña…</p>;
  }

  const link = `dataforgood.mx/c/${campaign.shareToken || "------"}`;

  function copyLink() {
    navigator.clipboard?.writeText(`https://${link}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function regenerate() {
    setExpired(false);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-ink">Compartir campaña</h1>
          <p className="mt-1 text-[13px] text-ink-2">{campaign.name}</p>
        </div>
        {expired && <Tag tone="danger">Enlace caducado</Tag>}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-ink">Enlace público</p>
          {expired ? (
            <div className="mb-1.5 flex items-center justify-between gap-2 rounded border border-danger bg-danger-tint px-3.5 py-3">
              <span className="font-mono text-[13px] text-danger line-through opacity-70">
                {link}
              </span>
              <Tag tone="danger">Expirado</Tag>
            </div>
          ) : (
            <div className="mb-1.5 flex items-center justify-between gap-2 rounded border border-line-2 bg-surface px-3.5 py-3">
              <span className="truncate font-mono text-[13px] text-ink">{link}</span>
              <Button size="sm" onClick={copyLink}>
                {copied ? "Copiado" : "Copiar"}
              </Button>
            </div>
          )}
          <p className={`mb-4 text-[11.5px] ${expired ? "text-danger" : "text-warn"}`}>
            {expired
              ? "Caducó hace 3 h 12 min. Quien lo abra verá un aviso de enlace no válido."
              : "El token expira en 21 h 04 min"}
          </p>

          {expired ? (
            <div className="mb-4 rounded-lg bg-warn-tint p-3.5 text-[12.5px] text-warn">
              Los aportes ya recibidos por este enlace se conservan. Al regenerar el
              token se crea una dirección nueva y la anterior queda inutilizable de
              forma permanente.
            </div>
          ) : (
            <div className="mb-4 rounded-lg bg-sunken p-3.5 text-[12.5px] text-ink-2">
              Quien abra el enlace puede aportar sin registrarse mientras el token siga
              vigente. Sus aportes se registran como anónimos.
            </div>
          )}

          <Button
            variant={expired ? "primary" : "secondary"}
            className="mb-2.5 w-full"
            onClick={regenerate}
          >
            {expired ? "Regenerar enlace y QR" : "Regenerar token"}
          </Button>
          <Link href="/mis-campanas">
            <Button className="w-full">Volver a mis campañas</Button>
          </Link>
        </div>

        <div>
          <p className="mb-1.5 text-[13px] font-medium text-ink">Código QR</p>
          <div
            className={`mb-3 flex h-42 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line-2 bg-sunken py-8 ${
              expired ? "opacity-40" : ""
            }`}
          >
            {expired ? (
              <span className="font-mono text-[12.5px] text-ink-3">QR inactivo</span>
            ) : (
              <>
                <QrPlaceholder />
                <span className="font-mono text-[11.5px] text-ink-3">
                  {campaign.shareToken || "token"} · 512 × 512 px
                </span>
              </>
            )}
          </div>

          {expired ? (
            <div className="rounded-lg bg-sunken p-3.5">
              <p className="mb-2.5 text-[12.5px] font-bold text-ink">
                Actividad del enlace caducado
              </p>
              <div className="flex justify-between py-1 text-[13px]">
                <span className="text-ink-2">Aportes recibidos</span>
                <span className="font-mono font-medium">27</span>
              </div>
              <div className="flex justify-between py-1 text-[13px]">
                <span className="text-ink-2">Visitas</span>
                <span className="font-mono font-medium">184</span>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button className="flex-1">Descargar PNG</Button>
              <Button className="flex-1">Descargar SVG</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QrPlaceholder() {
  return (
    <svg width="86" height="86" viewBox="0 0 29 29" shapeRendering="crispEdges" aria-label="Código QR de ejemplo">
      <rect width="29" height="29" fill="#fff" />
      <g fill="#17181A">
        <path d="M0 0h7v7H0z" />
        <path d="M1 1h5v5H1z" fill="#fff" />
        <path d="M2 2h3v3H2z" />
        <path d="M22 0h7v7h-7z" />
        <path d="M23 1h5v5h-5z" fill="#fff" />
        <path d="M24 2h3v3h-3z" />
        <path d="M0 22h7v7H0z" />
        <path d="M1 23h5v5H1z" fill="#fff" />
        <path d="M2 24h3v3H2z" />
        <path d="M9 9h2v2H9zM12 10h2v2h-2zM15 9h1v2h-1zM18 10h2v1h-2zM21 9h1v1h-1zM24 10h1v1h-1zM27 9h1v1h-1z" />
        <path d="M10 13h1v1h-1zM13 13h2v1h-2zM17 13h1v1h-1zM20 14h2v1h-2zM24 13h1v1h-1z" />
      </g>
    </svg>
  );
}
