"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Field, Textarea } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import type { Campaign } from "@/types";

export default function AportarPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [description, setDescription] = useState("");

  useEffect(() => {
    async function loadCampaign() {
      try {
        const response = await fetch(`/api/campanas?id=${encodeURIComponent(params.id)}`, { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error ?? "No se pudo cargar la campaña");
        setCampaign(payload.data as Campaign);
        setIsCreator(Boolean(payload.viewer?.isCreator));
      } catch (cause) {
        setLoadError(cause instanceof Error ? cause.message : "No se pudo cargar la campaña");
      }
    }
    void loadCampaign();
  }, [params.id]);

  if (loadError) return <p className="text-sm text-danger">{loadError}</p>;
  if (!campaign) return <p className="text-sm text-ink-2">Cargando campaña...</p>;
  if (isCreator) return <p className="rounded-lg bg-sunken p-4 text-sm text-ink-2">No puedes aportar en una campaña que creaste.</p>;

  const submittedCount = 0;
  const quotaReached = submittedCount >= campaign.quotaPerUser;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setFileName(null);
      setFileError(null);
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      setFileName(null);
      setFileError("Formato no válido. Usa .jpg, .jpeg o .png.");
      return;
    }

    if (file.size > 10_000_000) {
      setFileName(null);
      setFileError("El archivo pesa más de 10 MB. Elige otro: no se comprime automáticamente.");
      return;
    }

    setFileError(null);
    setFileName(file.name);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push("/mis-aportes");
  }

  const canSubmit = !quotaReached && Boolean(fileName) && description.trim().length > 0 && description.length <= 1000;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-xl font-extrabold text-ink">Nuevo aporte</h1>
      <p className="mb-6 text-[13px] text-ink-2">
        {campaign.name} · aporte {campaign.currentContributions % campaign.quotaPerUser + 1}{" "}
        de tu cuota de {campaign.quotaPerUser}
      </p>

      {quotaReached && <p className="mb-5 rounded-lg border border-ok bg-ok-tint p-3 text-[13px] text-ok">Alcanzaste tu cuota en esta campaña. La campaña sigue abierta para otras personas, pero ya no puedes enviar más aportes.</p>}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-ink">
            Archivo <span className="text-danger">*</span>
          </p>
          <label className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed border-line-2 bg-sunken p-6 text-center text-[13px] text-ink-2 hover:border-accent">
            <input type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" className="hidden" onChange={handleFileChange} />
            {fileName ? (
              <span className="font-medium text-ink">{fileName}</span>
            ) : (
              <>
                <span className="font-medium text-ink">Arrastra una imagen o haz clic para buscarla</span>
                <span className="font-mono text-[11px]">.jpg .jpeg .png · máximo 10 MB</span>
              </>
            )}
          </label>
          {fileError && <p className="mt-2 rounded border border-danger bg-danger-tint p-2 text-[12px] text-danger">{fileError}</p>}
        </div>

        <div>
          <Field label="Descripción" required>
            <Textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe qué se ve en el contenido"
              maxLength={1000}
              required
            />
          </Field>
          <p className="mb-4 text-right text-[11px] font-mono text-ink-3">
            {description.length} / 1000
          </p>

          <p className="mb-2 text-[13px] font-medium text-ink">Marca lo que aplique</p>
          <div className="mb-5 rounded-lg border border-line bg-surface p-3.5">
            <label className="mb-2 flex items-center gap-2 text-[12.5px] text-ink-2">
              <input type="checkbox" /> Árbol joven (menos de 3 m)
            </label>
            <label className="mb-2 flex items-center gap-2 text-[12.5px] text-ink-2">
              <input type="checkbox" /> Presenta ramas secas
            </label>
            <label className="flex items-center gap-2 text-[12.5px] text-ink-2">
              <input type="checkbox" /> Alcorque descubierto
            </label>
          </div>

          <Button variant="primary" type="submit" className="w-full" disabled={!canSubmit}>
            Enviar aporte
          </Button>
          <p className="mt-2 text-center text-[11.5px] text-ink-3">
            Quedará pendiente de revisión
          </p>
        </div>
      </form>
    </div>
  );
}
