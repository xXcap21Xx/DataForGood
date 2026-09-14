import { randomUUID } from "crypto";
import path from "path";
import { Client } from "minio";

const BUCKET = process.env.MINIO_BUCKET || "aportes";

export const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: Number(process.env.MINIO_PORT || 9000),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY || "admin",
  secretKey: process.env.MINIO_SECRET_KEY || "admin12345",
});

let bucketEnsured: Promise<void> | null = null;

async function ensureBucket() {
  if (!bucketEnsured) {
    bucketEnsured = (async () => {
      const exists = await minioClient.bucketExists(BUCKET).catch(() => false);
      if (!exists) {
        await minioClient.makeBucket(BUCKET);
      }
    })();
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

  await minioClient.putObject(BUCKET, objectKey, buffer, buffer.byteLength, {
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

  const stream = await minioClient.getObject(BUCKET, objectKey);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}
