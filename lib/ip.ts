/**
 * IP del cliente detrás del proxy inverso. El proxy agrega la IP real AL
 * FINAL de X-Forwarded-For (proxy_add_x_forwarded_for); lo de la izquierda
 * lo puede escribir el cliente. Por eso se toma el último valor, no el
 * primero. Sin proxy delante, el encabezado entero es del cliente: no uses
 * este valor como única defensa.
 */
export function ipDelCliente(headers: Headers): string {
  const ultimo = headers.get("x-forwarded-for")?.split(",").pop()?.trim();
  return ultimo || headers.get("x-real-ip")?.trim() || "desconocida";
}
