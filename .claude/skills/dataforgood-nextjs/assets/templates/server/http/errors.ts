import type { ErrorRequestHandler } from 'express';
import { z } from 'zod';

// Error de dominio con código estable. El frontend decide qué mostrar a partir de `code`,
// no del mensaje, para poder cambiar textos sin romper la interfaz.
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

// Validar entrada con Zod. Devuelve el dato tipado o lanza 400.
// Nota Express 5: req.query es de solo lectura; no intentes reasignarlo, usa el valor devuelto.
export function parseInput<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new AppError(400, 'ENTRADA_INVALIDA', 'Revisa los datos enviados.', z.flattenError(result.error));
  }
  return result.data;
}

// Formato único de error para toda la API: { error: { code, message, details? } }
// (Este archivo no importa env a propósito: permissions.ts lo usa y debe poder probarse sin variables de entorno.)
const isProd = process.env.NODE_ENV === 'production';
// Express reconoce el manejador de errores por sus 4 parámetros: _next debe quedarse.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const apiErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'JSON_INVALIDO', message: 'El cuerpo no es JSON válido.' } });
    return;
  }
  console.error(err);
  res.status(500).json({
    error: { code: 'ERROR_INTERNO', message: isProd ? 'Ocurrió un error inesperado.' : String(err?.message ?? err) },
  });
};
