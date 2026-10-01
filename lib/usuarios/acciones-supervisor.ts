"use server";

// Server action revertirAccion (revertir un dictamen de supervisor). Verifica la sesión raíz,
// pero su lógica sigue pendiente (TODO). Cuando se implemente, debe registrar supervision.revertir en audit_log.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { hasRootSession } from "@/lib/rootSession";

export type DatosDeReversion = {
  causal: string;
  descripcion: string;
  notificarAfectado: boolean;
  observacionEnExpediente: boolean;
};

const MINIMO_DESCRIPCION = 40;

async function exigirSuperUsuario(): Promise<void> {
  if (!(await hasRootSession())) throw new Error("No autorizado");
}

/**
 * Revertir es potestad exclusiva del SuperUsuario: ni el propio supervisor ni
 * otro pueden deshacer una decisión ajena.
 */
export async function revertirAccion(
  supervisorId: string,
  accionId: string,
  datos: DatosDeReversion,
): Promise<{ ok: false; error: string } | never> {
  await exigirSuperUsuario();

  if (!datos.causal) {
    return { ok: false, error: "Selecciona una causal." };
  }
  if (datos.descripcion.trim().length < MINIMO_DESCRIPCION) {
    return {
      ok: false,
      error: `La descripción debe tener al menos ${MINIMO_DESCRIPCION} caracteres.`,
    };
  }

  /*
   * TODO, en una transacción:
   *
   *   1. Releer la acción y abortar si ya tiene revertidaEn. Entre que se
   *      pintó la pantalla y se pulsó el botón, otro SuperUsuario pudo
   *      revertirla; sin esta comprobación se aplicaría dos veces.
   *   2. Deshacer el efecto según el tipo (levantar veto, reactivar campaña,
   *      retirar revisor, descontar strike, devolver a revisión). El mapa de
   *      efectos está en describirReversion, en supervisores.ts.
   *   3. Marcar la acción original con revertidaEn, SIN borrarla ni editar su
   *      motivo: el historial es inmutable.
   *   4. Insertar el registro de la reversión con causal, descripción y autor.
   *   5. Notificar si datos.notificarAfectado.
   *   6. Si datos.observacionEnExpediente, dejar la nota en el expediente del
   *      supervisor. Esto NO retira el rol: para eso está Gestión de roles.
   */

  revalidatePath(`/usuarios/supervisores/${supervisorId}`);
  redirect(`/usuarios/supervisores/${supervisorId}`);
}
