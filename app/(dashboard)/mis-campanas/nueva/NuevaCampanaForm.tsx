"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Field, Input, Textarea } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Tag from "@/components/ui/Tag";
import { getCampaignById, getMyCampaigns } from "@/data/screensData";
import type { DataType } from "@/types";

const THEMES = [
  "Medio ambiente",
  "Salud urbana",
  "Educación",
  "Infraestructura",
  "Protección animal",
  "Movilidad",
];

const DATA_TYPES: { value: DataType; label: string }[] = [
  { value: "texto", label: "Texto" },
  { value: "foto", label: "Foto" },
  { value: "video", label: "Video" },
  { value: "audio", label: "Audio" },
  { value: "documento", label: "Documento" },
];

const MAX_ACTIVE_CAMPAIGNS = 5;

export default function NuevaCampanaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const editingCampaign = editId ? getCampaignById(editId) : undefined;

  const myCampaigns = useMemo(() => getMyCampaigns(), []);
  const activeCampaigns = myCampaigns.filter((c) => c.status === "activa");
  const limitReached = !editingCampaign && activeCampaigns.length >= MAX_ACTIVE_CAMPAIGNS;

  const [name, setName] = useState(editingCampaign?.name ?? "");
  const [description, setDescription] = useState(editingCampaign?.description ?? "");
  const [theme, setTheme] = useState(editingCampaign?.tag ?? THEMES[0]);
  const [dataTypes, setDataTypes] = useState<DataType[]>(
    editingCampaign?.dataTypes ?? ["foto"]
  );
  const [collectionMode, setCollectionMode] = useState<"checklist" | "texto_libre">(
    "checklist"
  );
  const [goal, setGoal] = useState(String(editingCampaign?.goalContributions ?? 500));
  const [quota, setQuota] = useState(String(editingCampaign?.quotaPerUser ?? 10));
  const [startDate, setStartDate] = useState(editingCampaign?.startDate ?? "");
  const [endDate, setEndDate] = useState(editingCampaign?.endDate ?? "");

  function toggleDataType(type: DataType) {
    setDataTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  function handleSubmit(e: React.FormEvent, asDraft: boolean) {
    e.preventDefault();
    // En producción: POST/PUT a la API y redirigir con el id real.
    router.push("/mis-campanas");
  }

  const canPublish = !limitReached && name && description && dataTypes.length > 0;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-ink">
            {editingCampaign ? "Editar campaña" : "Nueva campaña"}
          </h1>
          <p className="mt-1 text-[13px] text-ink-2">
            Completa los tres bloques y envíala a revisión
          </p>
        </div>
        <Tag tone={limitReached ? "danger" : "default"}>
          {limitReached ? "Límite alcanzado" : "Borrador"}
        </Tag>
      </div>

      {limitReached && (
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3 rounded-lg bg-danger-tint p-4 text-[13px] text-danger">
          <p>
            <b>Ya tienes {MAX_ACTIVE_CAMPAIGNS} campañas activas.</b> El sistema permite un
            máximo de {MAX_ACTIVE_CAMPAIGNS} en simultáneo. Puedes guardar esta como
            borrador y publicarla cuando finalices o pauses alguna de las otras.
          </p>
          <Link href="/mis-campanas">
            <Button size="sm">Ver mis campañas</Button>
          </Link>
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e, false)}>
        <p className="mb-3 font-mono text-[12px] uppercase tracking-wide text-ink-3">
          1 · Datos básicos
        </p>
        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <Field label="Nombre de la campaña" required>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                required
              />
            </Field>
            <p className="mb-3 -mt-3 text-right font-mono text-[11px] text-ink-3">
              {name.length} / 80
            </p>

            <p className="mb-1.5 text-[13px] font-medium text-ink">
              Temática <span className="text-danger">*</span>
            </p>
            <div className="mb-1 flex flex-wrap gap-2">
              {THEMES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  className={`rounded-pill border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                    theme === t
                      ? "border-accent bg-accent text-white"
                      : "border-line-2 bg-surface text-ink-2 hover:border-accent"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="text-[11.5px] text-ink-3">
              Define en qué categoría aparece la campaña en el catálogo público.
            </p>
          </div>

          <div>
            <Field label="Descripción" required>
              <Textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                required
              />
            </Field>
            <p className="-mt-3 text-right font-mono text-[11px] text-ink-3">
              {description.length} / 500
            </p>
          </div>
        </div>

        <p className="mb-3 font-mono text-[12px] uppercase tracking-wide text-ink-3">
          2 · Qué se recolecta
        </p>
        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-ink">
              Tipo de dato solicitado <span className="text-danger">*</span>
            </p>
            <div className="mb-4 flex flex-wrap gap-2">
              {DATA_TYPES.map((dt) => (
                <button
                  key={dt.value}
                  type="button"
                  onClick={() => toggleDataType(dt.value)}
                  className={`rounded-pill border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                    dataTypes.includes(dt.value)
                      ? "border-accent bg-accent text-white"
                      : "border-line-2 bg-surface text-ink-2 hover:border-accent"
                  }`}
                >
                  {dt.label}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <Field label="Meta total">
                <Input
                  type="number"
                  min={1}
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="font-mono"
                />
              </Field>
              <Field label="Cuota por persona">
                <Input
                  type="number"
                  min={1}
                  value={quota}
                  onChange={(e) => setQuota(e.target.value)}
                  className="font-mono"
                />
              </Field>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[13px] font-medium text-ink">
              Cómo describe su aporte el participante
            </p>
            <div className="mb-2.5 flex gap-2">
              {(["checklist", "texto_libre"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setCollectionMode(mode)}
                  className={`rounded-pill border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                    collectionMode === mode
                      ? "border-accent bg-accent text-white"
                      : "border-line-2 bg-surface text-ink-2 hover:border-accent"
                  }`}
                >
                  {mode === "checklist" ? "Checklist" : "Texto libre"}
                </button>
              ))}
            </div>
            {collectionMode === "checklist" && (
              <div className="rounded-lg border border-line bg-surface p-3.5">
                <label className="mb-2 flex items-center gap-2 text-[12.5px] text-ink-2">
                  <input type="checkbox" defaultChecked readOnly /> Especie del árbol
                </label>
                <label className="mb-2 flex items-center gap-2 text-[12.5px] text-ink-2">
                  <input type="checkbox" defaultChecked readOnly /> Estado de salud aparente
                </label>
                <button type="button" className="text-[12.5px] font-medium text-accent">
                  + Agregar opción
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="mb-3 font-mono text-[12px] uppercase tracking-wide text-ink-3">
          3 · Vigencia
        </p>
        <div className="mb-2 max-w-md">
          <Field label="Vigencia" required>
            <div className="flex gap-3">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="font-mono"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="font-mono"
              />
            </div>
          </Field>
        </div>
        <Field label="Ubicación">
          <Input value="Tepic, Nayarit" disabled className="max-w-xs bg-sunken" />
        </Field>

        <div className="mb-6 max-w-lg rounded-lg bg-warn-tint p-4 text-[12.5px] text-warn">
          Al enviar, la campaña pasa a "En revisión" y no podrás editarla hasta que el
          supervisor responda.
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p className="font-mono text-[12.5px] text-ink-2">
            {activeCampaigns.length} de {MAX_ACTIVE_CAMPAIGNS} campañas activas usadas
          </p>
          <div className="flex gap-2.5">
            <Button type="submit" onClick={(e) => handleSubmit(e, true)}>
              Guardar borrador
            </Button>
            <Button variant="primary" type="submit" disabled={!canPublish}>
              Enviar a revisión
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
