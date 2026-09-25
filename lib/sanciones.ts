import { pool } from "@/lib/db";

/*
 * Qué hace cada sanción (según el formulario del panel, /usuarios/[id]/sancion):
 *   - STRIKE: solo suma al contador; no bloquea.
 *   - SUSPENSION_TEMPORAL: bloquea la cuenta durante `dias` desde aplicada_en.
 *   - BANEO_DE_CAMPANA ("Baneo permanente" en la interfaz): bloquea la cuenta
 *     hasta que el SuperUsuario la restaure.
 * Una cuenta bloqueada no puede iniciar sesión (correo ni Google) y sus
 * sesiones abiertas dejan de valer (getSessionUser devuelve null).
 */
export const TIPOS_QUE_BLOQUEAN = new Set(["SUSPENSION_TEMPORAL", "BANEO_DE_CAMPANA"]);

/**
 * Al acumular este número de strikes, la cuenta se banea sola
 * (aplicarSancion). Los strikes no se borran nunca, así que si el
 * SuperUsuario restaura ese baneo, el siguiente strike vuelve a banear.
 */
export const STRIKES_PARA_BANEO = 3;

/**
 * Condición SQL: hay una sanción vigente que bloquea a `usuarios u`. Es la
 * misma regla que usa el directorio para marcar SUSPENDIDA/BANEADA.
 */
export const SQL_SANCION_BLOQUEANTE = `
  EXISTS (
    SELECT 1 FROM sanciones s
    WHERE s.usuario_id = u.id AND s.activa
      AND (
        s.tipo = 'BANEO_DE_CAMPANA'
        OR (s.tipo = 'SUSPENSION_TEMPORAL'
            AND s.aplicada_en + (COALESCE(s.dias, 0) || ' days')::interval > NOW())
      )
  )
`;

export type Bloqueo = { permanente: true } | { permanente: false; hasta: Date };

/** Sanción que bloquea hoy a la cuenta, o null si puede entrar. */
export async function obtenerBloqueo(usuarioId: number): Promise<Bloqueo | null> {
  const result = await pool.query<{ tipo: string; hasta: Date | null }>(
    `SELECT s.tipo,
            CASE WHEN s.tipo = 'SUSPENSION_TEMPORAL'
                 THEN s.aplicada_en + (COALESCE(s.dias, 0) || ' days')::interval
            END AS hasta
     FROM sanciones s
     WHERE s.usuario_id = $1 AND s.activa
       AND (
         s.tipo = 'BANEO_DE_CAMPANA'
         OR (s.tipo = 'SUSPENSION_TEMPORAL'
             AND s.aplicada_en + (COALESCE(s.dias, 0) || ' days')::interval > NOW())
       )
     -- El baneo manda sobre cualquier suspensión; entre suspensiones, la más larga.
     ORDER BY (s.tipo = 'BANEO_DE_CAMPANA') DESC, hasta DESC NULLS FIRST
     LIMIT 1`,
    [usuarioId]
  );

  if (result.rowCount === 0) return null;
  const fila = result.rows[0];
  return fila.tipo === "BANEO_DE_CAMPANA" || !fila.hasta
    ? { permanente: true }
    : { permanente: false, hasta: new Date(fila.hasta) };
}

/** Mensaje para la pantalla de inicio de sesión. */
export function mensajeDeBloqueo(bloqueo: Bloqueo): string {
  if (bloqueo.permanente) {
    return "Tu cuenta está bloqueada. Si crees que es un error, contáctanos.";
  }
  const fecha = bloqueo.hasta.toLocaleString("es-MX", {
    dateStyle: "long",
    timeStyle: "short",
    // Misma zona que el resto del panel (Tepic, Nayarit).
    timeZone: "America/Mazatlan",
  });
  // La hora ya puede terminar en punto ("11:54 a.m."): no duplicarlo.
  return `Tu cuenta está suspendida hasta el ${fecha}`.replace(/\.?$/, ".");
}
