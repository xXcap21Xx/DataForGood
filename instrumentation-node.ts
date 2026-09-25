// Solo corre en el runtime de Node (lo importa instrumentation.ts). Está en
// su propio archivo porque Next también analiza instrumentation.ts para el
// runtime Edge, donde process.exit y `pg` no existen.
import { ensureCoreSchema } from "@/lib/db-schema";

export async function crearEsquemaAlArrancar(): Promise<void> {
  // Postgres puede tardar en aceptar conexiones justo al levantar el stack.
  const INTENTOS = 30;
  for (let intento = 1; ; intento++) {
    try {
      await ensureCoreSchema();
      return;
    } catch (error) {
      if (intento >= INTENTOS) {
        console.error("No se pudo crear el esquema de la base de datos:", error);
        // En producción, que el contenedor se reinicie (restart: always) en
        // vez de quedar arriba sin esquema. En desarrollo se deja seguir para
        // ver el error en pantalla.
        if (process.env.NODE_ENV === "production") process.exit(1);
        return;
      }
      console.warn(`Base de datos no disponible (intento ${intento}/${INTENTOS}), reintentando...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}
