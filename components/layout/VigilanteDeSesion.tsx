"use client";

// Revisa la sesión (GET /api/auth/sesion) en cada navegación del cliente y recarga si ya no vale,
// para que una sanción aplicada a media sesión lleve a /cuenta-bloqueada sin esperar.

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { BASE_PATH } from "@/lib/base-path";

/**
 * El layout de (dashboard) no se vuelve a renderizar al navegar dentro de la
 * app, así que no se entera si a la cuenta la suspenden o banean a media
 * sesión. En cada cambio de pantalla se revisa la sesión; si ya no vale, se
 * recarga y el servidor (exigirUsuario) la manda a /cuenta-bloqueada o a /entrar.
 */
export default function VigilanteDeSesion() {
  const pathname = usePathname();
  const primeraVez = useRef(true);

  useEffect(() => {
    // Al montar, el layout acaba de validar la sesión en el servidor.
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    void fetch(`${BASE_PATH}/api/auth/sesion`, { cache: "no-store" })
      .then((response) => {
        if (response.status === 401) window.location.reload();
      })
      .catch(() => {
        // Sin red no se puede saber; la siguiente navegación lo vuelve a intentar.
      });
  }, [pathname]);

  return null;
}
