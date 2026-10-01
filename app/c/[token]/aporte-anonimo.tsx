"use client";

// Formulario de /c/[token] para aportar SIN cuenta. Envía a POST /api/c/[token]/aportes,
// que valida el enlace, la cuota por dispositivo y el tope por IP. Después de enviar, la
// persona solo ve cuántos aportes le quedan: no puede consultar ni editar lo que mandó.

import { useState } from "react";
import Button from "@/components/ui/Button";
import { Field, Textarea } from "@/components/ui/Input";
import { LARGO_MAXIMO_DESCRIPCION, errorDeArchivo } from "@/lib/aportes/archivo";
import { BASE_PATH } from "@/lib/base-path";
import { etiquetaDeRespuesta, type SeccionDeChecklist } from "@/lib/campanas/checklist";

export default function AporteAnonimo({
  token,
  secciones,
  cuota,
  restantesIniciales,
}: {
  token: string;
  secciones: SeccionDeChecklist[];
  cuota: number;
  restantesIniciales: number;
}) {
  const [restantes, setRestantes] = useState(restantesIniciales);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  // Cambia la key del input de archivo para vaciarlo después de enviar.
  const [vuelta, setVuelta] = useState(0);

  function elegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const elegido = e.target.files?.[0] ?? null;
    const problema = elegido ? errorDeArchivo(elegido) : null;
    setErrorArchivo(problema);
    setArchivo(problema ? null : elegido);
  }

  function alternar(valor: string) {
    setMarcadas((actual) => (actual.includes(valor) ? actual.filter((v) => v !== valor) : [...actual, valor]));
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!archivo) return;
    setEnviando(true);
    setError(null);
    try {
      const datos = new FormData();
      datos.set("file", archivo);
      datos.set("description", descripcion);
      marcadas.forEach((valor) => datos.append("caracteristicas", valor));
      const response = await fetch(`${BASE_PATH}/api/c/${encodeURIComponent(token)}/aportes`, { method: "POST", body: datos });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "No se pudo enviar el aporte");
      setRestantes(Number(payload.data?.restantes ?? 0));
      setEnviado(true);
      setArchivo(null);
      setDescripcion("");
      setMarcadas([]);
      setVuelta((v) => v + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo enviar el aporte");
    } finally {
      setEnviando(false);
    }
  }

  if (restantes <= 0) {
    return (
      <p className="rounded-lg border border-ok bg-ok-tint p-3.5 text-[13px] text-ok">
        {enviado ? "¡Gracias! Tu aporte quedó pendiente de revisión. " : ""}
        Ya enviaste los {cuota} {cuota === 1 ? "aporte" : "aportes"} que permite esta campaña desde este dispositivo.
      </p>
    );
  }

  const puedeEnviar =
    Boolean(archivo) && descripcion.trim().length > 0 && descripcion.length <= LARGO_MAXIMO_DESCRIPCION && !enviando;

  return (
    <form onSubmit={enviar}>
      {enviado && (
        <p className="mb-4 rounded-lg border border-ok bg-ok-tint p-3.5 text-[13px] text-ok" role="status">
          ¡Gracias! Tu aporte quedó pendiente de revisión. Puedes enviar {restantes} más.
        </p>
      )}

      <p className="mb-1.5 text-[13px] font-medium text-ink">
        Archivo <span className="text-danger">*</span>
      </p>
      <label className="mb-4 flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed border-line-2 bg-sunken p-6 text-center text-[13px] text-ink-2 hover:border-accent">
        <input key={vuelta} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" className="hidden" onChange={elegirArchivo} />
        {archivo ? (
          <span className="font-medium text-ink">{archivo.name}</span>
        ) : (
          <>
            <span className="font-medium text-ink">Toca para elegir una foto</span>
            <span className="font-mono text-[11px]">.jpg .jpeg .png · máximo 10 MB</span>
          </>
        )}
      </label>
      {errorArchivo && <p className="-mt-2 mb-4 rounded border border-danger bg-danger-tint p-2 text-[12px] text-danger">{errorArchivo}</p>}

      <Field label="Descripción" required>
        <Textarea
          rows={4}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Describe qué se ve en la foto"
          maxLength={LARGO_MAXIMO_DESCRIPCION}
          required
        />
      </Field>
      <p className="mb-4 text-right font-mono text-[11px] text-ink-3">
        {descripcion.length} / {LARGO_MAXIMO_DESCRIPCION}
      </p>

      {secciones.map((seccion, i) => (
        <fieldset key={seccion.titulo || i} className="mb-4 rounded-lg border border-line bg-surface p-3.5">
          <legend className="px-1 text-[13px] font-medium text-ink">{seccion.titulo || "Marca lo que aplique"}</legend>
          {seccion.opciones.map((opcion) => {
            const valor = etiquetaDeRespuesta(seccion.titulo, opcion);
            return (
              <label key={opcion} className="mb-2 flex items-center gap-2 text-[12.5px] text-ink-2 last:mb-0">
                <input type="checkbox" checked={marcadas.includes(valor)} onChange={() => alternar(valor)} />
                {opcion}
              </label>
            );
          })}
        </fieldset>
      ))}

      {error && (
        <p className="mb-3 rounded border border-danger bg-danger-tint p-2 text-[12px] text-danger" role="alert">
          {error}
        </p>
      )}

      <Button variant="primary" type="submit" className="w-full" disabled={!puedeEnviar}>
        {enviando ? "Enviando…" : "Enviar aporte sin cuenta"}
      </Button>
      <p className="mt-2 text-center text-[11.5px] text-ink-3">
        Se registra como anónimo y queda pendiente de revisión. Te quedan {restantes} de {cuota} desde este dispositivo.
      </p>
    </form>
  );
}
