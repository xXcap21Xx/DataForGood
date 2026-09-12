// Almacenamiento: MinIO Community Edition (imagen oficial final, sin parches; decisión del equipo).
// Se usa el SDK estándar de S3 y no el de MinIO para que, si algún día hay que migrar a otro
// servicio S3-compatible, solo cambien variables de entorno.
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import { env } from '@/server/env';

const base = {
  region: env.S3_REGION,
  forcePathStyle: true, // MinIO usa rutas tipo http://host/bucket/objeto
  credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
};

const g = globalThis as typeof globalThis & { __dfgS3Internal?: S3Client; __dfgS3Public?: S3Client };

// Operaciones que hace el servidor (HeadObject, DeleteObject...). Usa la red interna de Docker.
export const s3Internal = (g.__dfgS3Internal ??= new S3Client({ ...base, endpoint: env.S3_INTERNAL_ENDPOINT }));

// SOLO para firmar URLs que abrirá el navegador. La firma incluye el host: si firmas con
// http://minio:9000 el navegador no puede resolverlo, y si reescribes el host la firma deja de ser válida.
export const s3Public = (g.__dfgS3Public ??= new S3Client({ ...base, endpoint: env.S3_PUBLIC_ENDPOINT }));

export const BUCKET = env.S3_BUCKET;

// Espera a que el bucket esté disponible. La app NO lo crea: su usuario de MinIO solo tiene
// permisos sobre objetos. Lo crea el servicio minio-setup de Docker Compose.
export async function waitForStorage({ attempts = 30, delayMs = 2000 } = {}) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await s3Internal.send(new HeadBucketCommand({ Bucket: BUCKET }));
      return;
    } catch (err: unknown) {
      const status = (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      if (status === 404) {
        throw new Error(`El bucket "${BUCKET}" no existe. Revisa los logs del servicio minio-setup.`);
      }
      if (status === 403) {
        throw new Error('MinIO rechazó las credenciales de la app. Revisa MINIO_APP_ACCESS_KEY / MINIO_APP_SECRET_KEY.');
      }
      if (i === attempts) throw err;
      await new Promise((r) => setTimeout(r, delayMs)); // MinIO aún arrancando
    }
  }
}
