# Almacenamiento de archivos (MinIO)

## Contenido
1. Cómo funciona hoy
2. Subir
3. Mostrar y descargar
4. Configuración
5. Riesgos y pendientes

## 1. Cómo funciona hoy

`lib/minio.ts` crea, en el primer uso, un `Client` del SDK `minio` con las variables `MINIO_*` (sin valores por defecto para las credenciales) y exporta:

- **`saveUploadedFile(file, subdir)`:** crea el bucket la primera vez (`MINIO_BUCKET`, por defecto `aportes`), guarda el objeto como `<subdir>/<uuid><ext>` con `putObject` y devuelve `{ relativePath, originalName, mimeType, sizeBytes }`.
- **`readUploadedFile(key)`:** descarga el objeto completo a un `Buffer`.

**El archivo pasa por el servidor de Next.** El navegador manda `multipart/form-data` al route handler y el handler lo sube a MinIO. No hay URLs firmadas ni subida directa del navegador a MinIO.

## 2. Subir

`POST /api/aportes` (`app/api/aportes/route.ts`):

1. `getSessionUser()`, campaña activa, sin baneo, cuota disponible, sin ser el creador.
2. **Validación en el servidor:** hoy solo `image/jpeg` e `image/png`, hasta 10 MB (`ALLOWED_FILE_TYPES`, `MAX_FILE_SIZE`). La interfaz también valida, pero solo para avisar pronto.
3. `saveUploadedFile(file, \`campanas/${campaignId}\`)`, y después el `INSERT` en `aportes` con `file_path` = clave del objeto.

**Para aceptar video, audio o documentos** hay que ampliar la validación por tipo de dato de la campaña (`campanas.data_types`) y fijar límites por tipo. Subir archivos grandes a través del servidor ocupa memoria (el archivo completo queda en un `Buffer`). Si se necesitan archivos de más de unas decenas de MB, conviene pasar a subida directa con POST firmado: coméntalo antes de cambiar el flujo.

## 3. Mostrar y descargar

- **Archivo de un aporte:** `GET /api/aportes/[id]/archivo`. Verifica el permiso (ver `roles-y-sesiones.md` § 4), lee de MinIO y responde con el `Content-Type` guardado y `Cache-Control: private`. En las pantallas se usa esa URL como `src`.
- **Datos abiertos:** `GET /api/datos/[id]/descarga` solo para campañas `finalizada`. Arma un ZIP con `archiver` con los archivos de los aportes aceptados, renombrados `aporte-001.ext`... (sin nombre ni correo del participante), e incrementa `downloads_count`.
- **El bucket no se expone.** Nunca construyas URLs directas a MinIO para el navegador.

## 4. Configuración

- **Servicio `minio`:** sin puertos publicados; la app lo alcanza por la red interna (`MINIO_ENDPOINT=minio`). Los datos van en el volumen `minio_data`, o en la carpeta del host que indique `MINIO_DATA`.
- **Servicio `minio-init`:** usa la misma imagen, que trae `mc`, y entra con el root (`MINIO_ROOT_USER/PASSWORD`). Crea el bucket, lo deja privado y crea la política `dataforgood-app`: `GetBucketLocation`/`ListBucket` sobre el bucket, `GetObject`/`PutObject`/`DeleteObject` sobre sus objetos, y **niega** crear o editar service accounts (vector del CVE-2025-62506). Después crea el usuario `MINIO_ACCESS_KEY` con esa política. Es idempotente.
- **La app solo conoce el usuario limitado.** No puede crear buckets ni usar la API de administración (comprobado). Si agregas una operación nueva de S3, amplía la política en `docker-compose.yml`.
- **Con `next dev` fuera de Docker:** `MINIO_ENDPOINT=localhost` y `docker-compose.local.yml` para publicar el 9000 en `127.0.0.1`.

## 5. Riesgos y pendientes

- **La imagen ya no se puede descargar.** MinIO dejó de publicar imágenes: `quay.io/minio/minio` responde 401 y `minio/minio` "no existe". Solo funciona la que ya está en caché (`RELEASE.2025-09-07T16-13-09Z`), que además no recibe parches. Un servidor nuevo no puede levantar el stack. Hay que decidir el reemplazo (compilar desde el código fuente o usar otro almacenamiento compatible con S3).
- **Sin respaldos** del volumen de datos.
