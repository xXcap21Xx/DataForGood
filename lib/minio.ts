import { randomUUID } from "crypto";
import path from "path";
import { Client } from "minio";

const BUCKET = process.env.MINIO_BUCKET || "aportes";

// Credenciales sin valor por defecto: la app usa un usuario limitado al
// bucket (lo crea el servicio minio-init de docker-compose.yml), nunca el
// root de MinIO. Si faltan, falla en el primer uso con un error claro.
let client: Client | null = null;

function getClient(): Client {
  if (!client) {
    const accessKey = process.env.MINIO_ACCESS_KEY;
    const secretKey = process.env.MINIO_SECRET_KEY;
    if (!accessKey || !secretKey) {
      throw new Error("Faltan MINIO_ACCESS_KEY o MINIO_SECRET_KEY en el entorno.");
    }
    client = new Client({
      endPoint: process.env.MINIO_ENDPOINT || "localhost",
      port: Number(process.env.MINIO_PORT || 9000),
      useSSL: process.env.MINIO_USE_SSL === "true",
      accessKey,
      secretKey,
    });
  }
  return client;
}

let bucketEnsured: Promise<void> | null = null;

// En Docker el bucket ya lo crea minio-init (el usuario de la app no tiene
// permiso de crear buckets); esto cubre `next dev` contra un MinIO local.
async function ensureBucket() {
  if (!bucketEnsured) {
    bucketEnsured = (async () => {
      const exists = await getClient().bucketExists(BUCKET).catch(() => false);
      if (!exists) {
        await getClient().makeBucket(BUCKET);
      }
    })();
    // Si falla, que el siguiente intento lo vuelva a probar.
    bucketEnsured.catch(() => {
      bucketEnsured = null;
    });
  }
  return bucketEnsured;
}

export interface SavedUpload {
  relativePath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

export async function saveUploadedFile(file: File, subdir: string): Promise<SavedUpload> {
  await ensureBucket();

  const extension = path.extname(file.name).toLowerCase();
  const objectKey = `${subdir}/${randomUUID()}${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await getClient().putObject(BUCKET, objectKey, buffer, buffer.byteLength, {
    "Content-Type": file.type || "application/octet-stream",
  });

  return {
    relativePath: objectKey,
    originalName: file.name,
    mimeType: file.type,
    sizeBytes: buffer.byteLength,
  };
}

export async function readUploadedFile(objectKey: string): Promise<Buffer> {
  await ensureBucket();

  const stream = await getClient().getObject(BUCKET, objectKey);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}
