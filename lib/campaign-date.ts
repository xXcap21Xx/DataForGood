/**
 * Convierte fechas de campa?a a una fecha de calendario, sin aplicar UTC.
 * PostgreSQL puede entregar una columna DATE como Date; convertirla
 * directamente con `String(value).slice(0, 10)` produce textos como
 * "Tue Sep 22", que no son ISO y terminan mostrando 0 d?as restantes.
 */
function dateOnlyFromParts(year: number, month: number, day: number): string | null {
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

export function normalizeCampaignDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return dateOnlyFromParts(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }

  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return dateOnlyFromParts(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }

  // Compatibilidad con registros existentes que el driver devolvi? como
  // "Tue Sep 22 2026 ...". La respuesta p?blica siempre vuelve a ser ISO.
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return dateOnlyFromParts(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
}

export function calculateCampaignDaysRemaining(value: unknown): number | null {
  const dateOnly = normalizeCampaignDate(value);
  if (!dateOnly) return null;

  const [year, month, day] = dateOnly.split("-").map(Number);
  const end = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Math.max(0, Math.floor((end.getTime() - today.getTime()) / 86_400_000));
}
