"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Field, Input, Textarea } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Tag from "@/components/ui/Tag";
import type { Campaign, CollectionMode, DataType } from "@/types";
import { municipiosDe, NOMBRES_DE_ESTADOS } from "@/lib/mexico-geo";
import { opcionesCon } from "@/lib/perfil-opciones";

const DEFAULT_CHECKLIST_OPCIONES = ["Especie del árbol", "Estado de salud aparente"];

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
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;

    async function loadCampaigns() {
      try {
        const response = await fetch("/api/campanas?mine=true");
        if (!response.ok) return;
        const body = await response.json();
        if (activo) setCampaigns(Array.isArray(body.data) ? body.data : []);
      } finally {
        if (activo) setCargando(false);
      }
    }

    loadCampaigns();
    return () => {
      activo = false;
    };
  }, []);

  const editingCampaign = editId ? campaigns.find((campaign) => campaign.id === editId) : undefined;
  const activeCampaigns = campaigns.filter((c) => c.status === "activa");
  const limitReached = !editingCampaign && activeCampaigns.length >= MAX_ACTIVE_CAMPAIGNS;

  // Mientras carga, no se monta el formulario: sus campos leen
  // editingCampaign una sola vez, al montar (ver CampanaFormulario). Si se
  // montara antes de que llegue la campaña a editar, abriría en blanco.
  if (cargando) {
    return <p className="text-[13px] text-ink-2">Cargando...</p>;
  }

  return (
    <CampanaFormulario
      key={editingCampaign?.id ?? "nueva"}
      editingCampaign={editingCampaign}
      activeCampaigns={activeCampaigns.length}
      limitReached={limitReached}
    />
  );
}

function CampanaFormulario({
  editingCampaign,
  activeCampaigns,
  limitReached,
}: {
  editingCampaign: Campaign | undefined;
  activeCampaigns: number;
  limitReached: boolean;
}) {
  const router = useRouter();

  const [name, setName] = useState(editingCampaign?.name ?? "");
  const [description, setDescription] = useState(editingCampaign?.description ?? "");
  const [theme, setTheme] = useState(editingCampaign?.tag || THEMES[0]);
  const [dataTypes, setDataTypes] = useState<DataType[]>(editingCampaign?.dataTypes ?? ["foto"]);
  const [collectionMode, setCollectionMode] = useState<CollectionMode>(
    editingCampaign?.collectionMode ?? "checklist"
  );
  const [checklistOpciones, setChecklistOpciones] = useState<string[]>(
    editingCampaign?.checklistOpciones ?? DEFAULT_CHECKLIST_OPCIONES
  );
  const [newOpcion, setNewOpcion] = useState("");
  const [goal, setGoal] = useState(String(editingCampaign?.goalContributions ?? 500));
  const [quota, setQuota] = useState(String(editingCampaign?.quotaPerUser ?? 10));
  const [startDate, setStartDate] = useState(editingCampaign?.startDate ?? "");
  const [endDate, setEndDate] = useState(editingCampaign?.endDate ?? "");
  const [locationState, setLocationState] = useState(editingCampaign?.locationState ?? "");
  const [locationCity, setLocationCity] = useState(editingCampaign?.locationCity ?? "");
  const [locationColonia, setLocationColonia] = useState(editingCampaign?.locationColonia ?? "");

  function cambiarEstado(nuevoEstado: string) {
    setLocationState(nuevoEstado);
    // El municipio (y la colonia, que depende del municipio) pertenecen al
    // estado anterior: no tiene sentido conservarlos.
    setLocationCity("");
    setLocationColonia("");
  }

  function toggleDataType(type: DataType) {
    setDataTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  function addChecklistOpcion() {
    const value = newOpcion.trim();
    if (!value || checklistOpciones.includes(value)) return;
    setChecklistOpciones((prev) => [...prev, value]);
    setNewOpcion("");
  }

  function removeChecklistOpcion(value: string) {
    setChecklistOpciones((prev) => prev.filter((item) => item !== value));
  }

  async function handleSubmit(e: React.FormEvent, asDraft: boolean) {
    e.preventDefault();

    const camposEditables = {
      name,
      description,
      tematica: theme,
      tag: theme,
      status: asDraft ? "borrador" : "en_revision",
      dataTypes,
      collectionMode,
      checklistOpciones: collectionMode === "checklist" ? checklistOpciones : [],
      goalContributions: Number(goal),
      quotaPerUser: Number(quota),
      startDate,
      endDate,
      locationCity,
      locationState,
      locationColonia,
    };

    try {
      // Editar manda PATCH a la campaña existente; antes siempre mandaba
      // POST a /api/campanas, así que "editar" creaba una campaña nueva en
      // vez de actualizar la que ya existía.
      const response = editingCampaign
        ? await fetch(`/api/campanas/${editingCampaign.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(camposEditables),
          })
        : await fetch("/api/campanas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...camposEditables,
              currentContributions: 0,
              approvedContributions: 0,
              pendingContributions: 0,
              rejectedContributions: 0,
              participants: 0,
              organizer: "Ayuntamiento de Tepic",
              xpPerContribution: 50,
              isSpecial: false,
              daysRemaining: null,
              hasReviewerAssigned: false,
              shareToken: "",
              shareTokenExpiresAt: null,
              aportes: [],
            }),
          });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? (editingCampaign ? "No se pudo actualizar la campaña" : "No se pudo crear la campaña"));
      }

      router.push("/mis-campanas");
    } catch (error) {
      console.error(editingCampaign ? "Error actualizando campaña" : "Error creando campaña", error);
      router.push("/mis-campanas");
    }
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
                {checklistOpciones.length === 0 && (
                  <p className="mb-2 text-[12px] text-ink-3">Aún no agregas ninguna opción.</p>
                )}
                {checklistOpciones.map((opcion) => (
                  <div key={opcion} className="mb-2 flex items-center justify-between gap-2 text-[12.5px] text-ink-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked readOnly /> {opcion}
                    </label>
                    <button
                      type="button"
                      onClick={() => removeChecklistOpcion(opcion)}
                      className="text-[11.5px] font-medium text-danger"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={newOpcion}
                    onChange={(e) => setNewOpcion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addChecklistOpcion();
                      }
                    }}
                    maxLength={120}
                    placeholder="Nueva opción del checklist"
                    className="w-full rounded border border-line-2 bg-surface px-3 py-2 text-[12.5px] text-ink outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={addChecklistOpcion}
                    disabled={!newOpcion.trim()}
                    className="whitespace-nowrap text-[12.5px] font-medium text-accent disabled:opacity-40"
                  >
                    + Agregar opción
                  </button>
                </div>
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
        <p className="mb-3 font-mono text-[12px] uppercase tracking-wide text-ink-3">
          Ubicación
        </p>
        <div className="mb-6 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Estado">
            <select
              value={locationState}
              onChange={(e) => cambiarEstado(e.target.value)}
              className="w-full rounded border border-line-2 bg-surface px-3.5 py-3 text-sm text-ink outline-none transition-colors focus:border-accent"
            >
              <option value="">Selecciona un estado</option>
              {opcionesCon(locationState, NOMBRES_DE_ESTADOS).map((opcion) => (
                <option key={opcion}>{opcion}</option>
              ))}
            </select>
          </Field>
          <Field label="Municipio">
            <select
              value={locationCity}
              onChange={(e) => setLocationCity(e.target.value)}
              disabled={!locationState}
              className="w-full rounded border border-line-2 bg-surface px-3.5 py-3 text-sm text-ink outline-none transition-colors focus:border-accent disabled:opacity-50"
            >
              <option value="">
                {locationState ? "Selecciona un municipio" : "Primero selecciona un estado"}
              </option>
              {opcionesCon(locationCity, municipiosDe(locationState)).map((opcion) => (
                <option key={opcion}>{opcion}</option>
              ))}
            </select>
          </Field>
          <Field label="Colonia (opcional)" hint="Para segmentar la campaña dentro del municipio.">
            <Input
              value={locationColonia}
              onChange={(e) => setLocationColonia(e.target.value)}
              maxLength={150}
              placeholder="p. ej. Centro"
            />
          </Field>
        </div>

        <div className="mb-6 max-w-lg rounded-lg bg-warn-tint p-4 text-[12.5px] text-warn">
          Al enviar, la campaña pasa a &quot;En revisión&quot; y no podrás editarla hasta que el
          supervisor responda.
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p className="font-mono text-[12.5px] text-ink-2">
            {activeCampaigns} de {MAX_ACTIVE_CAMPAIGNS} campañas activas usadas
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
