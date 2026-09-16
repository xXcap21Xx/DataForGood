"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CampaignCard from "@/components/cards/CampaignCard";
import Button from "@/components/ui/Button";
import type { Campaign } from "@/types";

const FILTROS = ["Todas", "Guardadas", "Medio ambiente", "Salud y bienestar", "Educación", "Infraestructura"];

export default function CampanasPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeTag, setActiveTag] = useState("Todas");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargarCampanas() {
      try {
        const response = await fetch("/api/campanas", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error ?? "No se pudieron cargar las campañas");
        const todas = Array.isArray(payload.data) ? (payload.data as Campaign[]) : [];
        // Solo campañas aprobadas por el supervisor (estado "activa") se muestran aquí.
        setCampaigns(todas.filter((campaign) => campaign.status === "activa"));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No se pudieron cargar las campañas");
      } finally {
        setCargando(false);
      }
    }
    void cargarCampanas();
  }, []);

  const filtered =
    activeTag === "Todas"
      ? campaigns
      : activeTag === "Guardadas"
        ? campaigns.filter((c) => c.isSaved)
        : campaigns.filter((c) => c.tag === activeTag);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Campañas disponibles</h1>
          <p className="mt-1 text-[13px] text-ink-2">
            Descubre proyectos con impacto social cerca de ti.
          </p>
        </div>
        <Link href="/mis-campanas/nueva">
          <Button variant="primary" size="sm">
            Crear campaña +
          </Button>
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTROS.map((filtro) => {
          const active = filtro === activeTag;
          const contador =
            filtro === "Todas"
              ? campaigns.length
              : filtro === "Guardadas"
                ? campaigns.filter((c) => c.isSaved).length
                : null;
          return (
            <button
              key={filtro}
              type="button"
              onClick={() => setActiveTag(filtro)}
              className={`rounded-pill border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                active
                  ? "border-accent bg-accent text-white"
                  : "border-line-2 bg-surface text-ink-2 hover:border-accent"
              }`}
            >
              {filtro}
              {contador !== null && <span className="ml-1.5 font-mono">{contador}</span>}
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="rounded-lg bg-danger-tint p-4 text-sm text-danger">{error}</p>
      ) : cargando ? (
        <p className="text-sm text-ink-2">Cargando campañas…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-ink-2">
          {activeTag === "Guardadas"
            ? "Todavía no has guardado ninguna campaña."
            : "No hay campañas aprobadas para esta temática todavía."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}
    </div>
  );
}
