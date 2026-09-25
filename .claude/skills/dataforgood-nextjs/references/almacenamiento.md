# Almacenamiento de archivos (MinIO)

## Contenido
1. Cómo funciona hoy
2. Subir
3. Mostrar y descargar
4. Configuración
5. Riesgos y pendientes

## 1. Cómo funciona hoy

`lib/minio.ts` crea un `Client` del SDK `minio` con las variables `MINIO_*` y exporta:

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

- `docker-compose.yml`: servicio `minio`, imagen `quay.io/minio/minio` **sin versión fija**, consola en `:9001` y datos en `C:/minio/data` (ruta del host Windows).
- Dentro de Docker la app usa `MINIO_ENDPOINT=minio`. Con `next dev` fuera de Docker, `localhost`.

## 5. Riesgos y pendientes (diagnóstico del 2026-09-24, sin aplicar)

- **La app usa el usuario root de MinIO** (`admin` / `admin12345`, fijos en el compose). Lo correcto es un usuario IAM normal con una política limitada al bucket, creado con `mc` en un contenedor de configuración.
- **9000 y 9001 están publicados en todas las interfaces.** La consola debería escuchar solo en `127.0.0.1`, y la API S3 no necesita publicarse, porque la app llega por la red interna.
- **Imagen sin versión fija:** fíjala a una etiqueta concreta. Las imágenes Community de MinIO dejaron de recibir parches en 2025 (CVE-2025-62506 corregida solo en código fuente), y ese es un riesgo aceptado que conviene documentar en la entrega.
- **Sin respaldos** del volumen de datos.

Son tareas de despliegue que hay que acordar; no las mezcles con otros cambios.
