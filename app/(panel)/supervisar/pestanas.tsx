"use client";

// Pestañas de /supervisar (por revisar / supervisadas).

import Link from "next/link";
import { useState } from "react";
import Tag from "@/components/ui/Tag";
import type { CampanaSupervisable } from "@/lib/supervision/root";

type TabKey = "pending" | "supervised" | "finished" | "flagged";

function porcentaje(campaign: CampanaSupervisable) {
  return campaign.goalContributions > 0
    ? `${Math.min(100, Math.round((campaign.currentContributions / campaign.goalContributions) * 100))}%`
    : "0%";
}

export default function PestanasDeSupervision({
  pendientes,
  supervisadas,
  finalizadas,
  conIncidencia,
}: {
  pendientes: CampanaSupervisable[];
  supervisadas: CampanaSupervisable[];
  finalizadas: CampanaSupervisable[];
  conIncidencia: CampanaSupervisable[];
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("pending");

  const renderPendingList = () => (
    <>
      <div className="mb-3 rounded-lg border border-line bg-sunken px-4 py-3 text-[13px] text-ink-2">
        Selecciona una campaña para ver su detalle. Las disponibles puedes tomarlas con “Supervisar esta campaña”; una vez tomada, solo tú puedes dictaminarla.
      </div>

      <div className="space-y-3">
        {pendientes.length === 0 ? (
          <div className="rounded-lg border border-line bg-surface p-5 text-[13px] text-ink-2">
            No hay campañas pendientes por revisar.
          </div>
        ) : (
          pendientes.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/supervisar/${campaign.id}`}
              className="block rounded-lg border border-line bg-surface p-5 shadow-sm transition-shadow hover:border-accent hover:shadow-md"
            >
              <div className="mb-1.5 flex flex-wrap items-start justify-between gap-3">
                <h2 className="text-[15px] font-extrabold text-ink">{campaign.name}</h2>
                {campaign.supervision === "mia" ? <Tag tone="ok">La supervisas tú</Tag> : <Tag tone="warn">Disponible</Tag>}
              </div>
              <p className="text-[12.5px] text-ink-3">
                {campaign.creatorName || "Usuario"} · {campaign.tag || "Sin temática"} · meta {campaign.goalContributions} aportes
              </p>
            </Link>
          ))
        )}
      </div>
    </>
  );

  const renderSupervisedList = () => (
    <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-line bg-sunken px-4 py-3">
        <p className="text-[13px] font-semibold text-ink">Campañas que estás supervisando</p>
        <Tag tone="ok">{supervisadas.length}</Tag>
      </div>

      {supervisadas.length === 0 ? (
        <div className="p-5 text-[13px] text-ink-2">Todavía no tienes campañas aceptadas bajo supervisión.</div>
      ) : (
        <div className="divide-y divide-line">
          {supervisadas.map((campaign) => (
            <div key={campaign.id} className="p-4">
              <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-[15px] font-extrabold text-ink">{campaign.name}</h3>
                  <p className="text-[12.5px] text-ink-3">{campaign.tag || "Sin temática"}</p>
                </div>
                <Tag tone={campaign.status === "activa" ? "ok" : "warn"}>{campaign.status === "activa" ? "Activa" : "Aceptada"}</Tag>
              </div>

              <div className="flex items-center justify-between gap-4 text-[12px] text-ink-2">
                <span>Progreso</span>
                <span className="font-mono">{campaign.currentContributions} / {campaign.goalContributions}</span>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-pill bg-sunken">
                <div className="h-full rounded-pill bg-ok" style={{ width: porcentaje(campaign) }} />
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px] text-ink-2">
                <span>{campaign.participants} participantes</span>
                <Link href={`/supervisar/${campaign.id}`} className="font-bold text-accent">Ver detalle</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderFlaggedList = () => (
    <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-line bg-sunken px-4 py-3">
        <p className="text-[13px] font-semibold text-ink">Campañas reportadas o rechazadas</p>
        <Tag tone="danger">{conIncidencia.length}</Tag>
      </div>

      {conIncidencia.length === 0 ? (
        <div className="p-5 text-[13px] text-ink-2">No tienes campañas reportadas o rechazadas.</div>
      ) : (
        <div className="divide-y divide-line">
          {conIncidencia.map((campaign) => {
            const isReported = campaign.latestSupervisionAction === "reportada";
            return (
              <div key={campaign.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <h3 className="text-[15px] font-extrabold text-ink">{campaign.name}</h3>
                  <p className="text-[12.5px] text-ink-3">
                    {campaign.creatorName || "Usuario"} · {campaign.tag || "Sin temática"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Tag tone={isReported ? "warn" : "danger"}>{isReported ? "Reportada" : "Rechazada"}</Tag>
                  <Link href={`/supervisar/${campaign.id}`} className="font-bold text-accent">Ver detalle</Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderFinishedList = () => (
    <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-line bg-sunken px-4 py-3">
        <p className="text-[13px] font-semibold text-ink">Campañas finalizadas</p>
        <Tag>{finalizadas.length}</Tag>
      </div>

      {finalizadas.length === 0 ? (
        <div className="p-5 text-[13px] text-ink-2">Todavía no tienes campañas finalizadas.</div>
      ) : (
        <div className="divide-y divide-line">
          {finalizadas.map((campaign) => (
            <div key={campaign.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <h3 className="text-[15px] font-extrabold text-ink">{campaign.name}</h3>
                <p className="text-[12.5px] text-ink-3">
                  {campaign.creatorName || "Usuario"} · {campaign.tag || "Sin temática"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Tag>Finalizada</Tag>
                <Link href={`/supervisar/${campaign.id}`} className="font-bold text-accent">Ver detalle</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "pending", label: "Por supervisar", count: pendientes.length },
    { key: "supervised", label: "Campañas supervisadas", count: supervisadas.length },
    { key: "flagged", label: "Campañas reportadas / rechazadas", count: conIncidencia.length },
    { key: "finished", label: "Campañas finalizadas", count: finalizadas.length },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">Modo supervisor · SuperUsuario</p>
          <h1 className="mt-2 text-2xl font-extrabold text-ink">
            {activeTab === "pending" ? "Campañas por supervisar" : activeTab === "supervised" ? "Campañas supervisadas" : activeTab === "finished" ? "Campañas finalizadas" : "Campañas reportadas / rechazadas"}
          </h1>
          <p className="mt-1 text-[13px] text-ink-2">
            {activeTab === "pending" ? `${pendientes.length} esperando revisión` : activeTab === "supervised" ? `${supervisadas.length} bajo supervisión` : activeTab === "finished" ? `${finalizadas.length} finalizadas` : `${conIncidencia.length} con incidencia`}
          </p>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={activeTab === key ? "rounded-pill bg-accent px-4 py-2 text-[12.5px] font-bold text-white shadow-sm" : "rounded-pill border border-line-2 bg-surface px-4 py-2 text-[12.5px] font-bold text-ink-2"}
          >
            {label}&nbsp; <span className="font-mono text-[11px]">{count}</span>
          </button>
        ))}
      </div>

      {activeTab === "pending" ? renderPendingList() : activeTab === "supervised" ? renderSupervisedList() : activeTab === "finished" ? renderFinishedList() : renderFlaggedList()}
    </div>
  );
}
