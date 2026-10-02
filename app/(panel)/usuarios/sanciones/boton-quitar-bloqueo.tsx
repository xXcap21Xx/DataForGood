"use client";

// Botón "Quitar bloqueo" de un dispositivo anónimo. Llama a la server action
// quitarBloqueoDeDispositivo (lib/aportes/acciones-bloqueos.ts).

import { useState, useTransition } from "react";

import Button from "@/components/sistema/Button";
import { quitarBloqueoDeDispositivo } from "@/lib/aportes/acciones-bloqueos";

export default function BotonQuitarBloqueo({ bloqueoId }: { bloqueoId: string }) {
  const [pendiente, iniciar] = useTransition();
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!confirmando) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setConfirmando(true)}>
        Quitar bloqueo
        <span className="sr-only"> del dispositivo {bloqueoId}</span>
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-nowrap items-center justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={() => setConfirmando(false)}>
          No
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={pendiente}
          onClick={() =>
            iniciar(async () => {
              const resultado = await quitarBloqueoDeDispositivo(bloqueoId);
              if (resultado.ok) setConfirmando(false);
              else setError(resultado.error);
            })
          }
        >
          {pendiente ? "…" : "Confirmar"}
        </Button>
      </div>
      {error && <p className="text-[12px] text-danger">{error}</p>}
    </div>
  );
}
