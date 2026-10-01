// Checklists de una campaña: lo que el participante marca además de la
// descripción (que siempre es obligatoria y es el "texto libre"). Lo usan el
// formulario de campaña, la pantalla de aportar y la API, así que no
// importa nada de servidor.

export type SeccionDeChecklist = {
  titulo: string;
  opciones: string[];
};

// Topes técnicos para que un cuerpo malicioso no guarde miles de filas; en
// la práctica el creador agrega los que necesite.
export const MAX_SECCIONES = 50;
export const MAX_OPCIONES_POR_SECCION = 50;
export const MAX_LARGO_TEXTO = 120;

/**
 * Valida lo que manda el formulario. Quita espacios, opciones vacías o
 * repetidas y secciones sin opciones. Devuelve un error si un checklist con
 * opciones no tiene título, o si hay dos checklists con el mismo título
 * (las respuestas se guardan como "Título: opción").
 */
export function normalizarSecciones(
  input: unknown
): { ok: true; secciones: SeccionDeChecklist[] } | { ok: false; error: string } {
  if (input == null) return { ok: true, secciones: [] };
  if (!Array.isArray(input)) return { ok: false, error: "checklistSecciones debe ser una lista" };
  if (input.length > MAX_SECCIONES) {
    return { ok: false, error: `Puedes agregar hasta ${MAX_SECCIONES} checklists` };
  }

  const secciones: SeccionDeChecklist[] = [];
  const titulos = new Set<string>();
  for (const raw of input) {
    const titulo = String((raw as { titulo?: unknown })?.titulo ?? "").trim();
    const crudas = (raw as { opciones?: unknown })?.opciones;
    const opciones = Array.from(
      new Set((Array.isArray(crudas) ? crudas : []).map((o) => String(o ?? "").trim()).filter(Boolean))
    );
    if (opciones.length === 0) continue;

    if (!titulo) return { ok: false, error: "Cada checklist necesita un título" };
    if (titulo.length > MAX_LARGO_TEXTO || opciones.some((o) => o.length > MAX_LARGO_TEXTO)) {
      return { ok: false, error: `Títulos y opciones pueden tener hasta ${MAX_LARGO_TEXTO} caracteres` };
    }
    if (opciones.length > MAX_OPCIONES_POR_SECCION) {
      return { ok: false, error: `Cada checklist puede tener hasta ${MAX_OPCIONES_POR_SECCION} opciones` };
    }
    const clave = titulo.toLowerCase();
    if (titulos.has(clave)) return { ok: false, error: `Hay dos checklists con el título "${titulo}"` };
    titulos.add(clave);

    secciones.push({ titulo, opciones });
  }
  return { ok: true, secciones };
}

/**
 * Checklists guardados en una fila de `campanas`. Las campañas anteriores a
 * las secciones solo tienen `checklist_opciones` (una lista plana): se leen
 * como un único checklist sin título.
 */
export function seccionesDesdeFila(row: {
  checklist_secciones?: unknown;
  checklist_opciones?: unknown;
  collection_mode?: unknown;
}): SeccionDeChecklist[] {
  if (Array.isArray(row.checklist_secciones) && row.checklist_secciones.length > 0) {
    return row.checklist_secciones
      .map((s) => ({
        titulo: String((s as SeccionDeChecklist)?.titulo ?? ""),
        opciones: Array.isArray((s as SeccionDeChecklist)?.opciones) ? (s as SeccionDeChecklist).opciones.map(String) : [],
      }))
      .filter((s) => s.opciones.length > 0);
  }
  const legado = Array.isArray(row.checklist_opciones) ? row.checklist_opciones.map(String) : [];
  if (String(row.collection_mode ?? "checklist") === "texto_libre" || legado.length === 0) return [];
  return [{ titulo: "", opciones: legado }];
}

/** Cómo se guarda una respuesta en `aportes.caracteristicas`: "Estado del árbol: Sano". */
export function etiquetaDeRespuesta(titulo: string, opcion: string): string {
  return titulo ? `${titulo}: ${opcion}` : opcion;
}

/** Filtra lo que mandó el participante a las opciones que existen en la campaña. */
export function respuestasValidas(valores: string[], secciones: SeccionDeChecklist[]): string[] {
  const permitidas = new Set(secciones.flatMap((s) => s.opciones.map((o) => etiquetaDeRespuesta(s.titulo, o))));
  return Array.from(new Set(valores.filter((v) => permitidas.has(v))));
}
