"use client";

// Fila "Preferencias" de la tarjeta de seguridad en /cuenta. "Ver" abre una ventana
// (<dialog> nativo, como ui/SelectorDeTemas) con las cuatro opciones de comunicación y
// notificaciones. Los indicadores aún son fijos: no se guardan en ningún lado.

import { useRef } from "react";
import Button from "@/components/ui/Button";

const OPCIONES = [
  { titulo: "Campañas nuevas", detalle: "Recibir alertas", activa: true },
  { titulo: "Aportes", detalle: "Estado actualizado", activa: true },
  { titulo: "Recordatorios", detalle: "Semanal", activa: false },
  { titulo: "Newsletter", detalle: "Resumen mensual", activa: true },
];

export default function PreferenciasDeComunicacion() {
  const dialogo = useRef<HTMLDialogElement>(null);

  function cerrar() {
    dialogo.current?.close();
  }

  return (
    <div className="rounded border border-line bg-sunken p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-ink">Preferencias</p>
          <p className="text-[12.5px] text-ink-2">Comunicación y notificaciones</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => dialogo.current?.showModal()}>
          Ver
        </Button>
      </div>

      <dialog
        ref={dialogo}
        aria-labelledby="preferencias-titulo"
        // Clic en el fondo (fuera de la caja): se cierra.
        onClick={(e) => {
          if (e.target === dialogo.current) cerrar();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-lg border border-line bg-surface p-0 text-ink shadow-lg backdrop:bg-ink/40"
      >
        <div className="flex max-h-[85vh] flex-col">
          <div className="border-b border-line p-5">
            <h2 id="preferencias-titulo" className="text-lg font-extrabold text-ink">
              Comunicación y notificaciones
            </h2>
            <p className="mt-1 text-[12.5px] text-ink-2">
              Los avisos que recibes de la plataforma.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {OPCIONES.map((opcion) => (
                <div key={opcion.titulo} className="rounded border border-line-2 bg-surface p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink">{opcion.titulo}</span>
                    <span className={`h-4 w-4 rounded-full ${opcion.activa ? "bg-ok" : "bg-line-2"}`} />
                  </div>
                  <p className="mt-2 text-[12px] text-ink-2">{opcion.detalle}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end border-t border-line p-4">
            <Button type="button" variant="primary" size="sm" onClick={cerrar}>
              Cerrar
            </Button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
