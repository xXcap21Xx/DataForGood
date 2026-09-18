"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { TEMAS_DE_INTERES } from "@/lib/intereses";
import { ESPECIALIDADES, OTRA_ESPECIALIDAD, opcionesCon } from "@/lib/perfil-opciones";
import { municipiosDe, NOMBRES_DE_ESTADOS } from "@/lib/mexico-geo";

type Usuario = {
  id: number;
  nombre: string;
  apellidos: string;
  state: string | null;
  city: string | null;
  specialty: string | null;
  intereses: string[];
  email: string;
};

export default function PerfilForm({ usuario, children }: { usuario: Usuario; children?: ReactNode }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(usuario.nombre);
  const [apellidos, setApellidos] = useState(usuario.apellidos);
  const [state, setState] = useState(usuario.state ?? "");
  const [city, setCity] = useState(usuario.city ?? "");
  const [specialty, setSpecialty] = useState(usuario.specialty ?? "");
  const [especialidadPersonalizada, setEspecialidadPersonalizada] = useState(
    () => specialty !== "" && !ESPECIALIDADES.includes(specialty),
  );
  const [intereses, setIntereses] = useState<string[]>(usuario.intereses);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  function alternarInteres(tema: string) {
    setIntereses((prev) => (prev.includes(tema) ? prev.filter((t) => t !== tema) : [...prev, tema]));
  }

  function cambiarEstado(nuevoEstado: string) {
    setState(nuevoEstado);
    // El municipio pertenece al estado anterior: no tiene sentido conservarlo.
    setCity("");
  }

  function elegirEspecialidad(valor: string) {
    if (valor === OTRA_ESPECIALIDAD) {
      setEspecialidadPersonalizada(true);
      setSpecialty("");
    } else {
      setEspecialidadPersonalizada(false);
      setSpecialty(valor);
    }
  }

  async function guardar() {
    if (!nombre.trim() || !apellidos.trim()) {
      setMensaje({ tipo: "error", texto: "El nombre y los apellidos son obligatorios." });
      return;
    }

    setGuardando(true);
    setMensaje(null);
    try {
      const response = await fetch(`/api/usuarios/${usuario.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          apellidos: apellidos.trim(),
          state,
          city,
          specialty,
          intereses,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "No se pudo guardar el perfil");
      }

      setMensaje({ tipo: "ok", texto: "Cambios guardados." });
      router.refresh();
    } catch (error) {
      setMensaje({ tipo: "error", texto: error instanceof Error ? error.message : "No se pudo guardar el perfil" });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <section className="rounded-lg border border-line bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
              Perfil
            </p>
            <h2 className="mt-1 text-lg font-extrabold text-ink">Datos personales</h2>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" required>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={120} />
            </Field>
            <Field label="Apellidos" required>
              <Input value={apellidos} onChange={(e) => setApellidos(e.target.value)} maxLength={120} />
            </Field>
          </div>

          <Field label="Correo electrónico">
            <Input readOnly value={usuario.email} className="opacity-70" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Estado">
              <select
                value={state}
                onChange={(e) => cambiarEstado(e.target.value)}
                className="w-full rounded border border-line-2 bg-surface px-3.5 py-3 text-sm text-ink outline-none transition-colors focus:border-accent"
              >
                <option value="">Selecciona un estado</option>
                {opcionesCon(state, NOMBRES_DE_ESTADOS).map((opcion) => (
                  <option key={opcion}>{opcion}</option>
                ))}
              </select>
            </Field>
            <Field label="Municipio">
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={!state}
                className="w-full rounded border border-line-2 bg-surface px-3.5 py-3 text-sm text-ink outline-none transition-colors focus:border-accent disabled:opacity-50"
              >
                <option value="">{state ? "Selecciona un municipio" : "Primero selecciona un estado"}</option>
                {opcionesCon(city, municipiosDe(state)).map((opcion) => (
                  <option key={opcion}>{opcion}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Especialidad">
            <select
              value={especialidadPersonalizada ? OTRA_ESPECIALIDAD : specialty}
              onChange={(e) => elegirEspecialidad(e.target.value)}
              className="w-full rounded border border-line-2 bg-surface px-3.5 py-3 text-sm text-ink outline-none transition-colors focus:border-accent"
            >
              <option value="">Selecciona una especialidad</option>
              {ESPECIALIDADES.map((opcion) => (
                <option key={opcion}>{opcion}</option>
              ))}
              <option value={OTRA_ESPECIALIDAD}>Otra (especifica)</option>
            </select>
            {especialidadPersonalizada && (
              <Input
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="Escribe tu especialidad"
                maxLength={150}
                className="mt-2"
              />
            )}
          </Field>
        </div>
      </section>

      {children}

      <section className="rounded-lg border border-line bg-surface p-5 md:col-span-2">
        <div className="mb-4">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
            Mis intereses
          </p>
          <h2 className="mt-1 text-lg font-extrabold text-ink">Temáticas que guían tus aportes</h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {TEMAS_DE_INTERES.map((tema) => {
            const activo = intereses.includes(tema);
            return (
              <button
                key={tema}
                type="button"
                onClick={() => alternarInteres(tema)}
                className={`inline-flex items-center gap-2 rounded-pill border px-4 py-2 text-[12px] font-bold transition-colors ${
                  activo
                    ? "border-accent bg-accent text-white"
                    : "border-line-2 bg-surface text-ink-2 hover:border-accent"
                }`}
              >
                {tema}
                {activo && <span className="font-mono text-[11px]">×</span>}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[12.5px] text-ink-2">
          Determinan qué campañas aparecen en “Sugeridas para ti”.
        </p>
      </section>

      <div className="flex items-center justify-end gap-3 md:col-span-2">
        {mensaje && (
          <p className={`text-[12.5px] ${mensaje.tipo === "ok" ? "text-ok" : "text-danger"}`}>{mensaje.texto}</p>
        )}
        <Button variant="primary" size="sm" onClick={guardar} disabled={guardando}>
          {guardando ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </>
  );
}
