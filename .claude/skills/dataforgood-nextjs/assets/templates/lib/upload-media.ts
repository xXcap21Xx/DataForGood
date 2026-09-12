// Cliente: sube un archivo directo a MinIO con el POST firmado. El archivo nunca pasa por Next/Express.
// Úsalo desde componentes 'use client' (formularios de aporte, grabadora de audio, cámara).
export async function uploadMedia(
  file: Blob & { name?: string },
  opts: { campaignId: string; kind: 'foto' | 'video' | 'audio' | 'documento'; onProgress?: (pct: number) => void },
): Promise<{ id: string }> {
  const intentRes = await fetch('/api/v1/uploads/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campaignId: opts.campaignId, kind: opts.kind, mimeType: file.type, sizeBytes: file.size }),
  });
  if (!intentRes.ok) throw await toError(intentRes);
  const { uploadId, url, fields } = (await intentRes.json()) as { uploadId: string; url: string; fields: Record<string, string> };

  const form = new FormData();
  Object.entries(fields).forEach(([k, v]) => form.append(k, v));
  form.append('file', file); // el archivo SIEMPRE va al final del formulario

  // XMLHttpRequest en lugar de fetch para reportar progreso: importante con datos móviles lentos.
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.upload.onprogress = (e) => e.lengthComputable && opts.onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Error de almacenamiento (${xhr.status})`)));
    xhr.onerror = () => reject(new Error('Sin conexión con el almacenamiento'));
    xhr.send(form);
  });

  const doneRes = await fetch(`/api/v1/uploads/${uploadId}/complete`, { method: 'POST' });
  if (!doneRes.ok) throw await toError(doneRes);
  return { id: uploadId };
}

async function toError(res: Response) {
  const body = await res.json().catch(() => null);
  return new Error(body?.error?.message ?? `Error ${res.status}`);
}
