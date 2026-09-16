"use client";

import { useState, useTransition } from "react";

import Button from "@/components/sistema/Button";
import { restaurarAcceso } from "@/lib/usuarios/acciones-usuarios";

export default function BotonRestaurar({
  sancionId,
  usuario,
}: {
  sancionId: string;
  usuario: string;
}) {
  const [pendiente, iniciar] = useTransition();
  const [confirmando, setConfirmando] = useState(false);

  if (!confirmando) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setConfirmando(true)}>
        Restaurar
        <span className="sr-only"> el acceso de {usuario}</span>
      </Button>
    );
  }

  return (
    <div className="flex flex-nowrap items-center justify-end gap-2">
      <Button variant="secondary" size="sm" onClick={() => setConfirmando(false)}>
        No
      </Button>
      <Button
        variant="primary"
        size="sm"
        disabled={pendiente}
        onClick={() => iniciar(() => restaurarAcceso(sancionId).then(() => setConfirmando(false)))}
      >
        {pendiente ? "…" : "Confirmar"}
      </Button>
    </div>
  );
}
