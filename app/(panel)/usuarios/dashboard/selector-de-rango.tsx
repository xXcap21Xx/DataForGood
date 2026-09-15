"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useId, useTransition } from "react";

import styles from "../../../../components/sistema/ui.module.css";

const OPCIONES = [
  { valor: "30d", etiqueta: "Últimos 30 días" },
  { valor: "90d", etiqueta: "Últimos 90 días" },
  { valor: "12m", etiqueta: "Últimos 12 meses" },
];

/**
 * El rango vive en la URL, no en estado local: así la vista filtrada se puede
 * compartir o recargar, y el servidor recalcula los agregados.
 */
export default function SelectorDeRango({ valor }: { valor: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pendiente, iniciar] = useTransition();
  const id = useId();

  function cambiar(nuevo: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nuevo === "30d") params.delete("rango");
    else params.set("rango", nuevo);

    const qs = params.toString();
    iniciar(() => router.replace(qs ? `${pathname}?${qs}` : pathname));
  }

  return (
    <>
      <label className={styles.srOnly} htmlFor={id}>
        Rango de fechas
      </label>
      <select
        id={id}
        className={styles.select}
        value={valor}
        disabled={pendiente}
        onChange={(e) => cambiar(e.target.value)}
      >
        {OPCIONES.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.etiqueta}
          </option>
        ))}
      </select>
    </>
  );
}
