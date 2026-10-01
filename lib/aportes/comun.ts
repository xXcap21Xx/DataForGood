// Reglas de servidor compartidas por los dos caminos para enviar un aporte: con cuenta
// (POST /api/aportes) y sin cuenta desde un enlace público (POST /api/c/[token]/aportes,
// lib/campanas/aportes-anonimos.ts). Una regla, un lugar. Lo que también usa el
// navegador (tipos y tamaño de archivo) está en ./archivo.ts.

import { pool } from "@/lib/db";

export { LARGO_MAXIMO_DESCRIPCION, TAMANO_MAXIMO, TIPOS_DE_ARCHIVO, errorDeArchivo } from "@/lib/aportes/archivo";

/**
 * Suma un aporte nuevo a los contadores desnormalizados de la campaña.
 * `esPrimeroDeLaPersona`: era su primer aporte en la campaña (cuenta o dispositivo),
 * así que suma un participante.
 */
export async function sumarAporteALaCampana(campaignId: string | number, esPrimeroDeLaPersona: boolean): Promise<void> {
  await pool.query(
    `UPDATE campanas SET
      current_contributions = current_contributions + 1,
      pending_contributions = pending_contributions + 1,
      participants = participants + $2,
      updated_at = NOW()
    WHERE id = $1`,
    [campaignId, esPrimeroDeLaPersona ? 1 : 0]
  );
}
