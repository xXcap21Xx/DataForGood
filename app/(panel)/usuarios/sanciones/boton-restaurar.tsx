"use client";

// Botón "Restaurar acceso". Llama a la server action restaurarAcceso (lib/usuarios/acciones-usuarios.ts).

import { useState, useTransition } from "react";

import Button from "@/components/sistema/Button";
import { restaurarAcceso } from "@/lib/usuarios/acciones-usuarios";

export default function BotonRestaurar({
  sancionId,
  usuario,
  anchoCompleto = false,
}: {
  sancionId: string;
  usuario: string;
  anchoCompleto?: boolean;
}) {
  const [pendiente, iniciar] = useTransition();
  const [confirmando, setConfirmando] = useState(false);

  if (!confirmando) {
    return (
      <Button
        variant="secondary"
        size="sm"
        className={anchoCompleto ? "w-full md:w-auto" : ""}
        onClick={() => setConfirmando(true)}
      >
        Restaurar
        <span className="sr-only"> el acceso de {usuario}</span>
      </Button>
    );
  }

  return (
    <div
      className={`flex flex-nowrap items-center gap-2 ${
        anchoCompleto ? "w-full justify-stretch md:w-auto md:justify-end" : "justify-end"
      }`}
    >
      <Button
        variant="secondary"
        size="sm"
        className={anchoCompleto ? "flex-1 md:flex-none" : ""}
        onClick={() => setConfirmando(false)}
      >
        No
      </Button>
      <Button
        variant="primary"
        size="sm"
        className={anchoCompleto ? "flex-1 md:flex-none" : ""}
        disabled={pendiente}
        onClick={() => iniciar(() => restaurarAcceso(sancionId).then(() => setConfirmando(false)))}
      >
        {pendiente ? "…" : "Confirmar"}
      </Button>
    </div>
  );
}
