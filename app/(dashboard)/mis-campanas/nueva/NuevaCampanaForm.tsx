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

const ESTADO_LABELS: Record<string, string> = {
  borrador: "Borrador",
  en_revision: "En revisión",
  aceptada: "Aceptada",
  activa: "Activa",
  pausada: "Pausada",
  finalizada: "Finalizada",
  rechazada: "Rechazada",
};

function labelEstado(status: string | undefined) {
  return status ? ESTADO_LABELS[status] ?? status : "Borrador";
}

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

  // Reglas de edición por estado (dominio.md): una campaña en revisión o
  // rechazada se puede editar por completo y reenviar; activa, pausada o
  // aceptada (aprobada, esperando su fecha de inicio) solo permiten ajustar
  // meta y fecha de finalización, sin tocar su estado; finalizada queda en
  // solo lectura.
  const status = editingCampaign?.status;
  const soloLectura = status === "finalizada";
  const edicionLimitada = status === "activa" || status === "pausada" || status === "aceptada";
  const edicionCompleta = !edicionLimitada && !soloLectura;

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
  const [startTime, setStartTime] = useState(editingCampaign?.startTime ?? "");
  const [endDate, setEndDate] = useState(editingCampaign?.endDate ?? "");
  const [endTime, setEndTime] = useState(editingCampaign?.endTime ?? "");
  const [locationState, setLocationState] = useState(editingCampaign?.locationState ?? "");
  const [locationCity, setLocationCity] = useState(editingCampaign?.locationCity ?? "");
  const [locationColonia, setLocationColonia] = useState(editingCampaign?.locationColonia ?? "");
  const [reactivando, setReactivando] = useState(false);
  const [reactivarError, setReactivarError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const limiteActivasAlcanzado = activeCampaigns >= MAX_ACTIVE_CAMPAIGNS;

  async function handleReactivar() {
    if (!editingCampaign || limiteActivasAlcanzado) return;
    setReactivando(true);
    setReactivarError(null);
    try {
      const response = await fetch(`/api/campanas/${editingCampaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "activa" }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "No se pudo reactivar la campaña");
      }
      router.push("/mis-campanas");
    } catch (error) {
      setReactivarError(error instanceof Error ? error.message : "No se pudo reactivar la campaña");
      setReactivando(false);
    }
  }

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

  if (soloLectura) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-ink">{name}</h1>
            <p className="mt-1 text-[13px] text-ink-2">
              Esta campaña ya finalizó y queda en solo lectura: no se puede editar.
            </p>
          </div>
          <Tag>Finalizada</Tag>
        </div>

        {limiteActivasAlcanzado && (
          <div className="mb-4 max-w-lg rounded-lg bg-warn-tint p-4 text-[12.5px] text-warn">
            Ya tienes {MAX_ACTIVE_CAMPAIGNS} campañas activas. Pausa o finaliza otra antes de
            reactivar esta.
          </div>
        )}
        {reactivarError && (
          <div className="mb-4 max-w-lg rounded-lg bg-danger-tint p-4 text-[12.5px] text-danger">
            {reactivarError}
          </div>
        )}

        <div className="flex gap-2.5">
          <Link href="/mis-campanas">
            <Button>Volver a mis campañas</Button>
          </Link>
          <Button
            variant="primary"
            onClick={handleReactivar}
            disabled={limiteActivasAlcanzado || reactivando}
          >
            {reactivando ? "Reactivando..." : "Reactivar campaña"}
          </Button>
        </div>
      </div>
    );
  }

  // Solo se exige completo al enviar a revisión o al editar una campaña ya
  // aceptada/activa/pausada: un borrador puede quedar a medias a propósito
  // (es justo lo que permite seguir bajo el límite de 5 campañas activas).
  function validar(asDraft: boolean): string | null {
    if (edicionLimitada) {
      if (!Number(goal) || Number(goal) <= 0) return "La meta de aportes debe ser mayor a 0";
      if (!endDate) return "Falta la fecha de finalización";
      return null;
    }

    if (asDraft) return null;

    if (!name.trim()) return "Falta el nombre de la campaña";
    if (!description.trim()) return "Falta la descripción";
    if (dataTypes.length === 0) return "Selecciona al menos un tipo de dato";
    if (!goal || Number(goal) <= 0) return "La meta de aportes debe ser mayor a 0";
    if (!quota || Number(quota) <= 0) return "La cuota por persona debe ser mayor a 0";
    if (collectionMode === "checklist" && checklistOpciones.length === 0) {
      return "Agrega al menos una opción al checklist";
    }
    if (!startDate) return "Falta la fecha de inicio";
    if (!endDate) return "Falta la fecha de finalización";
    if (endDate < startDate) return "La fecha de finalización no puede ser anterior a la de inicio";
    if (!locationState) return "Selecciona un estado";
    if (!locationCity) return "Selecciona un municipio";

    return null;
  }

  async function handleSubmit(e: React.FormEvent, asDraft: boolean) {
    e.preventDefault();
    if (soloLectura) return;

    const error = validar(asDraft);
    if (error) {
      setFormError(error);
      return;
    }
    setFormError(null);

    // Activa, pausada o aceptada: solo se guardan meta y fecha/hora de fin,
    // y el estado no se manda, así la campaña se mantiene en el estado en el
    // que estaba.
    const camposEditables = edicionLimitada
      ? {
          goalContributions: Number(goal),
          endDate,
          endTime: endTime || null,
        }
      : {
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
          startTime: startTime || null,
          endDate,
          endTime: endTime || null,
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
      setFormError(error instanceof Error ? error.message : "No se pudo guardar la campaña");
    }
  }

  const canPublish = edicionLimitada
    ? Boolean(goal) && Boolean(endDate)
    : !limitReached && Boolean(name) && Boolean(description) && dataTypes.length > 0;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-ink">
            {editingCampaign ? "Editar campaña" : "Nueva campaña"}
          </h1>
          <p className="mt-1 text-[13px] text-ink-2">
            {edicionLimitada
              ? status === "aceptada"
                ? "La campaña ya fue aceptada y espera su fecha de inicio: solo puedes ajustar la meta de aportes y la fecha/hora de finalización."
                : "La campaña ya está en curso: solo puedes ajustar la meta de aportes y la fecha/hora de finalización."
              : "Completa los tres bloques y envíala a revisión"}
          </p>
        </div>
        <Tag tone={limitReached ? "danger" : "default"}>
          {limitReached ? "Límite alcanzado" : editingCampaign ? labelEstado(status) : "Borrador"}
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
                disabled={edicionLimitada}
                className="disabled:cursor-not-allowed disabled:opacity-50"
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
                  disabled={edicionLimitada}
                  onClick={() => setTheme(t)}
                  className={`rounded-pill border px-3 py-1.5 text-[12.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
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
                disabled={edicionLimitada}
                className="disabled:cursor-not-allowed disabled:opacity-50"
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
                  disabled={edicionLimitada}
                  onClick={() => toggleDataType(dt.value)}
                  className={`rounded-pill border px-3 py-1.5 text-[12.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
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
              <Field label="Meta total" required>
                <Input
                  type="number"
                  min={1}
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  required
                  className="font-mono"
                />
              </Field>
              <Field label="Cuota por persona" required>
                <Input
                  type="number"
                  min={1}
                  value={quota}
                  onChange={(e) => setQuota(e.target.value)}
                  required={!edicionLimitada}
                  disabled={edicionLimitada}
                  className="font-mono disabled:cursor-not-allowed disabled:opacity-50"
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
                  disabled={edicionLimitada}
                  onClick={() => setCollectionMode(mode)}
                  className={`rounded-pill border px-3 py-1.5 text-[12.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
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
                      disabled={edicionLimitada}
                      onClick={() => removeChecklistOpcion(opcion)}
                      className="text-[11.5px] font-medium text-danger disabled:cursor-not-allowed disabled:opacity-50"
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
                    disabled={edicionLimitada}
                    className="w-full rounded border border-line-2 bg-surface px-3 py-2 text-[12.5px] text-ink outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={addChecklistOpcion}
                    disabled={!newOpcion.trim() || edicionLimitada}
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
          <Field label="Vigencia" required hint="La hora es opcional: sin hora, la campaña activa o finaliza desde el inicio de ese día.">
            <div className="flex flex-wrap gap-3">
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  disabled={edicionLimitada}
                  className="font-mono disabled:cursor-not-allowed disabled:opacity-50"
                />
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={edicionLimitada}
                  className="font-mono disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="font-mono"
                />
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>
          </Field>
        </div>
        <p className="mb-3 font-mono text-[12px] uppercase tracking-wide text-ink-3">
          Ubicación
        </p>
        <div className="mb-6 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Estado" required>
            <select
              value={locationState}
              onChange={(e) => cambiarEstado(e.target.value)}
              required={!edicionLimitada}
              disabled={edicionLimitada}
              className="w-full rounded border border-line-2 bg-surface px-3.5 py-3 text-sm text-ink outline-none transition-colors focus:border-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Selecciona un estado</option>
              {opcionesCon(locationState, NOMBRES_DE_ESTADOS).map((opcion) => (
                <option key={opcion}>{opcion}</option>
              ))}
            </select>
          </Field>
          <Field label="Municipio" required>
            <select
              value={locationCity}
              onChange={(e) => setLocationCity(e.target.value)}
              required={!edicionLimitada}
              disabled={!locationState || edicionLimitada}
              className="w-full rounded border border-line-2 bg-surface px-3.5 py-3 text-sm text-ink outline-none transition-colors focus:border-accent disabled:cursor-not-allowed disabled:opacity-50"
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
              disabled={edicionLimitada}
              className="disabled:cursor-not-allowed disabled:opacity-50"
            />
          </Field>
        </div>

        {edicionCompleta && (
          <div className="mb-6 max-w-lg rounded-lg bg-warn-tint p-4 text-[12.5px] text-warn">
            {status === "en_revision" || status === "rechazada"
              ? "Puedes editar la campaña y volver a enviarla a revisión mientras el supervisor no responda."
              : "Al enviar, la campaña pasa a “En revisión”; podrás seguir editándola mientras el supervisor no responda."}
          </div>
        )}
        {edicionLimitada && (
          <div className="mb-6 max-w-lg rounded-lg bg-sunken p-4 text-[12.5px] text-ink-2">
            La campaña está {status === "pausada" ? "pausada" : status === "aceptada" ? "aceptada" : "activa"}: los cambios se
            guardan y mantiene su estado actual.
          </div>
        )}
        {formError && (
          <div className="mb-6 max-w-lg rounded-lg border border-danger bg-danger-tint p-4 text-[12.5px] text-danger">
            {formError}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p className="font-mono text-[12.5px] text-ink-2">
            {activeCampaigns} de {MAX_ACTIVE_CAMPAIGNS} campañas activas usadas
          </p>
          <div className="flex gap-2.5">
            {!edicionLimitada && (
              <Button type="submit" onClick={(e) => handleSubmit(e, true)}>
                Guardar borrador
              </Button>
            )}
            <Button variant="primary" type="submit" disabled={!canPublish}>
              {edicionLimitada ? "Guardar cambios" : "Enviar a revisión"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
