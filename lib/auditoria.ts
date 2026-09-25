import { headers } from "next/headers";
import { pool } from "@/lib/db";
import { ipDelCliente } from "@/lib/ip";

/*
 * Bitácora de acciones sensibles (tabla audit_log). Se llama DESPUÉS de que
 * la acción se completó. Si el registro falla, se reporta en consola pero no
 * se revierte la acción: perder una fila de bitácora es preferible a dejar
 * a medias un cambio de rol o una sanción.
 */

export type ActorDeAuditoria =
  | { tipo: "usuario"; id: number }
  | { tipo: "superusuario" }
  | { tipo: "anonimo" };

export type AccionAuditada =
  | "rol.asignar"
  | "rol.revocar"
  | "sancion.aplicar"
  | "sancion.restaurar"
  | "supervision.revertir"
  | "supervision.tomar"
  | "supervision.dictaminar"
  | "campana.banear"
  | "revisor.invitar"
  | "revisor.aceptar"
  | "root.acceso"
  | "root.acceso_fallido";

export async function registrarAuditoria(entrada: {
  actor: ActorDeAuditoria;
  accion: AccionAuditada;
  objetivo?: { tipo: string; id: string | number };
  detalle?: Record<string, unknown>;
}): Promise<void> {
  try {
    let ip: string | null = null;
    try {
      ip = ipDelCliente(await headers());
    } catch {
      // Fuera de una petición (no debería pasar) no hay encabezados.
    }

    await pool.query(
      `INSERT INTO audit_log (actor_tipo, actor_id, accion, objetivo_tipo, objetivo_id, detalle, ip)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
      [
        entrada.actor.tipo,
        entrada.actor.tipo === "usuario" ? entrada.actor.id : null,
        entrada.accion,
        entrada.objetivo?.tipo ?? null,
        entrada.objetivo ? String(entrada.objetivo.id) : null,
        JSON.stringify(entrada.detalle ?? {}),
        ip,
      ]
    );
  } catch (error) {
    console.error(`No se pudo registrar en audit_log (${entrada.accion}):`, error);
  }
}
