"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Field } from "@/components/ui/Input";

const INTERESTS = [
  "Medio ambiente",
  "Salud urbana",
  "Educación",
  "Infraestructura",
  "Protección animal",
  "Movilidad",
  "Cultura",
];

export default function BienvenidaPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(["Medio ambiente", "Educación"]);

  function toggleInterest(tag: string) {
    setSelected((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function finish() {
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
          defaultValue="Nayarit"
          className="w-full rounded border border-line-2 bg-surface px-3.5 py-3 text-sm text-ink outline-none focus:border-accent"
        >
          <option>Nayarit</option>
          <option>Jalisco</option>
          <option>Sinaloa</option>
        </select>
      </Field>

      <Field label="Ciudad">
        <select
          defaultValue="Tepic"
          className="w-full rounded border border-line-2 bg-surface px-3.5 py-3 text-sm text-ink outline-none focus:border-accent"
        >
          <option>Tepic</option>
          <option>Xalisco</option>
          <option>Compostela</option>
        </select>
      </Field>

      <Field
        label="Especialidad (opcional)"
        hint="Si más adelante te asignan el rol de supervisor, se usará para repartirte campañas de tu área."
      >
        <select
          defaultValue="Ingeniería de software"
          className="w-full rounded border border-line-2 bg-surface px-3.5 py-3 text-sm text-ink outline-none focus:border-accent"
        >
          <option>Ingeniería de software</option>
          <option>Biología</option>
          <option>Trabajo social</option>
        </select>
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
