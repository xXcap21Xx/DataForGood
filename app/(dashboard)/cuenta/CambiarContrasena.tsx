"use client";

// Botón "Cambiar" de la tarjeta Contraseña en /cuenta y su ventana (<dialog> nativo).
// Acción: PATCH /api/usuarios/[id]/contrasena con { actual, nueva }. La sesión sigue abierta.

import { useRef, useState } from "react";
import Button from "@/components/ui/Button";
import { Field } from "@/components/ui/Input";
import PasswordInput from "@/components/ui/PasswordInput";
import { BASE_PATH } from "@/lib/base-path";
import { REGLAS_DE_CONTRASENA } from "@/lib/reglas-contrasena";

export default function CambiarContrasena({
  usuarioId,
  tieneContrasena,
}: {
  usuarioId: number;
  tieneContrasena: boolean;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);

  const cumpleReglas = REGLAS_DE_CONTRASENA.every((regla) => regla.test(nueva));
  const coinciden = nueva.length > 0 && nueva === confirmacion;
  const puedeEnviar = actual.length > 0 && cumpleReglas && coinciden && !enviando;

  function abrir() {
    setActual("");
    setNueva("");
    setConfirmacion("");
    setError("");
    setListo(false);
    dialogo.current?.showModal();
  }

  function cerrar() {
    dialogo.current?.close();
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!puedeEnviar) return;
    setError("");
    setEnviando(true);
    try {
      const response = await fetch(`${BASE_PATH}/api/usuarios/${usuarioId}/contrasena`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actual, nueva }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload.error ?? "No se pudo cambiar la contraseña");
        return;
      }
      setActual("");
      setNueva("");
      setConfirmacion("");
      setListo(true);
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <Button variant="secondary" size="sm" disabled={!tieneContrasena} onClick={abrir}>
        Cambiar
      </Button>

      <dialog
        ref={dialogo}
        aria-labelledby="cambiar-contrasena-titulo"
        // Clic en el fondo (fuera de la caja): se cierra sin cambiar nada.
        onClick={(e) => {
          if (e.target === dialogo.current && !enviando) cerrar();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-line bg-surface p-0 text-ink shadow-lg backdrop:bg-ink/40"
      >
        {listo ? (
          <div className="p-5">
            <h2 id="cambiar-contrasena-titulo" className="text-lg font-extrabold text-ink">
              Contraseña actualizada
            </h2>
            <p className="mt-1 text-[13px] text-ink-2">
              La próxima vez que inicies sesión usa tu nueva contraseña. Tu sesión sigue abierta.
            </p>
            <div className="mt-5 flex justify-end">
              <Button type="button" variant="primary" size="sm" onClick={cerrar}>
                Listo
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={enviar} className="flex max-h-[85vh] flex-col" noValidate>
            <div className="border-b border-line p-5">
              <h2 id="cambiar-contrasena-titulo" className="text-lg font-extrabold text-ink">
                Cambiar contraseña
              </h2>
              <p className="mt-1 text-[12.5px] text-ink-2">
                Escribe tu contraseña actual y la nueva dos veces.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <Field label="Contraseña actual" required>
                <PasswordInput
                  name="actual"
                  value={actual}
                  onChange={(e) => setActual(e.target.value)}
                  autoComplete="current-password"
                  disabled={enviando}
                  required
                />
              </Field>
              <Field label="Nueva contraseña" required>
                <PasswordInput
                  name="nueva"
                  value={nueva}
                  onChange={(e) => setNueva(e.target.value)}
                  autoComplete="new-password"
                  disabled={enviando}
                  required
                />
              </Field>
              <Field label="Confirmar nueva contraseña" required>
                <PasswordInput
                  name="confirmacion"
                  value={confirmacion}
                  onChange={(e) => setConfirmacion(e.target.value)}
                  autoComplete="new-password"
                  disabled={enviando}
                  required
                  className={confirmacion.length > 0 && !coinciden ? "border-danger" : ""}
                />
              </Field>

              <ul className="flex flex-col gap-1.5">
                {REGLAS_DE_CONTRASENA.map((regla) => {
                  const cumple = regla.test(nueva);
                  return (
                    <li
                      key={regla.label}
                      className={`text-[12.5px] ${cumple ? "text-ok" : "text-ink-3"}`}
                    >
                      {cumple ? "✓" : "·"} {regla.label}
                    </li>
                  );
                })}
              </ul>

              {error && (
                <p role="alert" className="mt-4 text-[12px] text-danger">
                  {error}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-line p-4">
              <Button type="button" variant="secondary" size="sm" onClick={cerrar} disabled={enviando}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={!puedeEnviar}>
                {enviando ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
