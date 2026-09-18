"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { TEMAS_DE_INTERES as INTERESTS } from "@/lib/intereses";
import { ESPECIALIDADES, OTRA_ESPECIALIDAD, opcionesCon } from "@/lib/perfil-opciones";
import { municipiosDe, NOMBRES_DE_ESTADOS } from "@/lib/mexico-geo";

type SessionUser = {
  id: number;
  nombre: string;
  apellidos: string;
  state?: string | null;
  city?: string | null;
  specialty?: string | null;
  intereses?: string[];
};

export default function BienvenidaPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [especialidadPersonalizada, setEspecialidadPersonalizada] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const response = await fetch("/api/auth/sesion");
      if (!response.ok) {
        router.push("/entrar");
        return;
      }

      const body = await response.json();
      const currentUser = body.data as SessionUser | undefined;
      if (!currentUser) return;

      const especialidad = currentUser.specialty ?? "";
      setUser(currentUser);
      setSelected(currentUser.intereses ?? ["Medio ambiente", "Educación"]);
      setState(currentUser.state ?? "");
      setCity(currentUser.city ?? "");
      setSpecialty(especialidad);
      setEspecialidadPersonalizada(especialidad !== "" && !ESPECIALIDADES.includes(especialidad));
    }

    loadUser();
  }, [router]);

  function toggleInterest(tag: string) {
    setSelected((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
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

  async function finish() {
    if (!user?.id) {
      router.push("/campanas");
      return;
    }

    try {
      await fetch(`/api/usuarios/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state,
          city,
          specialty,
          intereses: selected,
        }),
      });
    } catch (error) {
      console.error("No se pudo guardar el perfil del usuario", error);
    }

    router.push("/campanas");
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-8">
      <div className="mb-1 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-ink">Cuéntanos de ti</h1>
          <p className="mt-1 font-mono text-[10.5px] uppercase tracking-wider text-accent">
            Paso 3 de 3 · Tu perfil
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={finish}>
          Omitir
        </Button>
      </div>
      <p className="mb-4 text-[13px] text-ink-2">
        Con esto te mostramos campañas relevantes y cercanas.
      </p>

      <div className="mb-5 flex gap-1.5">
        <div className="h-1 flex-1 rounded-pill bg-accent" />
        <div className="h-1 flex-1 rounded-pill bg-accent" />
        <div className="h-1 flex-1 rounded-pill bg-accent" />
      </div>

      <Field label="Estado">
        <select
          value={state}
          onChange={(e) => cambiarEstado(e.target.value)}
          className="w-full rounded border border-line-2 bg-surface px-3.5 py-3 text-sm text-ink outline-none focus:border-accent"
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
          className="w-full rounded border border-line-2 bg-surface px-3.5 py-3 text-sm text-ink outline-none focus:border-accent disabled:opacity-50"
        >
          <option value="">{state ? "Selecciona un municipio" : "Primero selecciona un estado"}</option>
          {opcionesCon(city, municipiosDe(state)).map((opcion) => (
            <option key={opcion}>{opcion}</option>
          ))}
        </select>
      </Field>

      <Field
        label="Especialidad (opcional)"
        hint="Si más adelante te asignan el rol de supervisor, se usará para repartirte campañas de tu área."
      >
        <select
          value={especialidadPersonalizada ? OTRA_ESPECIALIDAD : specialty}
          onChange={(e) => elegirEspecialidad(e.target.value)}
          className="w-full rounded border border-line-2 bg-surface px-3.5 py-3 text-sm text-ink outline-none focus:border-accent"
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

      <p className="mb-2 text-[13px] font-medium text-ink">¿Qué temas te interesan?</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {INTERESTS.map((tag) => {
          const active = selected.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggleInterest(tag)}
              className={`rounded-pill border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                active
                  ? "border-accent bg-accent text-white"
                  : "border-line-2 bg-surface text-ink-2 hover:border-accent"
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>
      <p className="mb-5 text-[11.5px] text-ink-3">
        Podrás agregar o quitar etiquetas en cualquier momento desde tu perfil.
      </p>

      <div className="mb-5 rounded-lg bg-sunken p-4 text-[12.5px] text-ink-2">
        Si omites este paso te asignamos etiquetas por defecto según las
        campañas más populares de tu zona.
      </div>

      <div className="flex justify-end gap-2.5">
        <Button variant="secondary" onClick={finish}>
          Omitir por ahora
        </Button>
        <Button variant="primary" onClick={finish}>
          Finalizar y explorar campañas
        </Button>
      </div>
    </div>
  );
}
