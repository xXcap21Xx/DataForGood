"use client";

// Cifra que cuenta desde 0 hasta su valor cuando entra en pantalla (landing).
// El servidor ya pinta el valor final: sin JavaScript, o con movimiento
// reducido, se ve el número quieto. El lector de pantalla solo oye el final.

import { useEffect, useRef } from "react";

const nf = new Intl.NumberFormat("es-MX");
const DURACION_MS = 1400;

export default function ContadorAnimado({ valor, className = "" }: { valor: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  // Solo presentación: escribe el número en el DOM cuadro a cuadro, sin
  // re-renderizar el componente.
  useEffect(() => {
    const el = ref.current;
    if (!el || valor <= 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cuadro = 0;
    el.textContent = nf.format(0);

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada.isIntersecting) return;
        observador.disconnect();
        const inicio = performance.now();
        const paso = (ahora: number) => {
          const t = Math.min(1, (ahora - inicio) / DURACION_MS);
          // Sale rápido y frena al final (ease-out cúbico).
          el.textContent = nf.format(Math.round(valor * (1 - (1 - t) ** 3)));
          if (t < 1) cuadro = requestAnimationFrame(paso);
        };
        cuadro = requestAnimationFrame(paso);
      },
      { threshold: 0.4 },
    );
    observador.observe(el);

    return () => {
      observador.disconnect();
      cancelAnimationFrame(cuadro);
      el.textContent = nf.format(valor);
    };
  }, [valor]);

  return (
    <span className={className}>
      <span ref={ref} aria-hidden="true">
        {nf.format(valor)}
      </span>
      <span className="sr-only">{nf.format(valor)}</span>
    </span>
  );
}
