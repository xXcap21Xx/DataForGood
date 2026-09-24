"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Vuelve a pedir el Server Component cada `ms` para el badge "En vivo". */
export default function RefrescoEnVivo({ ms = 3000 }: { ms?: number }) {
  const router = useRouter();

  useEffect(() => {
    const intervalo = setInterval(() => router.refresh(), ms);
    return () => clearInterval(intervalo);
  }, [router, ms]);

  return null;
}
