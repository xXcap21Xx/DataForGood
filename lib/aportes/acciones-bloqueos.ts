"use server";

// Server action del panel: el SuperUsuario quita el bloqueo global de un dispositivo anónimo
// antes de que venza (/usuarios/sanciones). Lógica en lib/aportes/sanciones-anonimas.ts.

import { revalidatePath } from "next/cache";
import { hasRootSession } from "@/lib/rootSession";
import { restaurarBloqueoGlobal } from "@/lib/aportes/sanciones-anonimas";

export async function quitarBloqueoDeDispositivo(bloqueoId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await hasRootSession())) throw new Error("No autorizado");

  const id = Number(bloqueoId);
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: "ID de bloqueo inválido." };

  try {
    if (!(await restaurarBloqueoGlobal(id))) return { ok: false, error: "El bloqueo no existe o ya se quitó." };
  } catch (error) {
    console.error("Error quitando bloqueo de dispositivo", error);
    return { ok: false, error: "No se pudo quitar el bloqueo." };
  }

  revalidatePath("/usuarios/sanciones");
  return { ok: true };
}
