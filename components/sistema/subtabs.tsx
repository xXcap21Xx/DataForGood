"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import styles from "./ui.module.css";

export type Pestana = { href: string; etiqueta: string };

export default function Subtabs({
  pestanas,
  etiquetaAria,
}: {
  pestanas: Pestana[];
  etiquetaAria: string;
}) {
  const pathname = usePathname();

  return (
    <nav className={styles.subtabs} aria-label={etiquetaAria}>
      {pestanas.map(({ href, etiqueta }) => {
        const activa = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`${styles.subtab} ${activa ? styles.subtabOn : ""}`}
            aria-current={activa ? "page" : undefined}
          >
            {etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}
