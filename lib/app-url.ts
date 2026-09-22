// Next 16 ya no arma la URL absoluta de una petición a partir del header
// Host (`experimental.trustHostHeader` es `false` por defecto): usa en su
// lugar el hostname:puerto con el que arrancó el servidor. En Docker eso es
// HOSTNAME=0.0.0.0 (necesario para aceptar conexiones desde fuera del
// contenedor), así que `new URL(path, request.url)` da
// "http://0.0.0.0:3000/..." en vez de la URL pública real. Para construir
// una URL absoluta que el navegador pueda usar (redirects, links en
// correos) hay que partir de un origen configurado, no de `request.url`.
const APP_ORIGIN = process.env.APP_ORIGIN || "http://localhost:3000";

export function absoluteUrl(path: string) {
  return new URL(path, APP_ORIGIN);
}
