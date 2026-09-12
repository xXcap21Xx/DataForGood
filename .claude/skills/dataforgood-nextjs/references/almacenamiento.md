# Almacenamiento de archivos (MinIO Community Edition)

## Contenido
1. Situación de MinIO (léelo antes de desplegar)
2. Flujo de subida
3. Endpoints y plantillas
4. Nombres de objetos
5. Mostrar archivos
6. Configuración: CORS, endpoints y proxy inverso
7. Limpieza de subidas abandonadas
8. Problemas frecuentes

## 1. Situación de MinIO

**Decisión del equipo:** usar MinIO Community Edition con su última imagen oficial, `minio/minio:RELEASE.2025-09-07T16-13-09Z`, en Docker. No la sustituyas por forks ni por otros servicios, y no cambies la etiqueta sin que lo pidan.

**Riesgo conocido.** Esa imagen ya no recibe parches. La vulnerabilidad más relevante es CVE-2025-62506 (severidad alta), una escalada de privilegios: una service account o cuenta STS con política de sesión restringida puede crear otra cuenta que hereda todos los permisos de su cuenta padre. Se corrigió en `RELEASE.2025-10-15T17-29-55Z`, versión para la que MinIO no publicó imagen; su nota de lanzamiento indica compilarla desde el código fuente. Los escáneres reportan además otras vulnerabilidades altas y medias en esa imagen.

**Medidas que compensan la falta de parches** (las plantillas ya aplican las cinco primeras):

1. **La app usa un usuario IAM normal con política limitada a su bucket**, creado por `docker/minio/setup.sh`. No es una service account derivada del root, así que la escalada de CVE-2025-62506 no le da más permisos de los que ya tiene. **No crees service accounts ni claves STS.**
2. **El root de MinIO solo lo usa `minio-setup`.** La app no conoce esas credenciales.
3. **La consola (9001) escucha solo en `127.0.0.1`.** Para usarla en un servidor remoto, abre un túnel SSH.
4. **El bucket es privado** (`mc anonymous set none`) y todo acceso pasa por URLs firmadas de corta duración.
5. **PostgreSQL y MinIO comparten una red interna de Docker con la app.** Postgres no publica puertos en el compose base.
6. **En producción, la API S3 (9000) se publica solo detrás del proxy inverso con TLS**, en su propio subdominio. No expongas el puerto directamente a internet.
7. **Haz respaldos periódicos del volumen `miniodata`**, junto con los de PostgreSQL.
8. **Documenta este riesgo aceptado** en la entrega de la residencia. Si más adelante el equipo decide reducirlo sin salir de MinIO, la opción es compilar la imagen de `RELEASE.2025-10-15T17-29-55Z` desde el código fuente oficial.

**El código usa `@aws-sdk/client-s3`, no el SDK de MinIO.** No cambia nada hoy, pero mantiene la puerta abierta a migrar sin reescribir módulos.

## 2. Flujo de subida

```
Cliente                         Express (/api/v1/uploads)                 MinIO
  │ POST /presign {campaignId,     │                                         │
  │   kind, mimeType, sizeBytes} ─►│ assertCan('aportes.crear')              │
  │                                │ valida tipo y tamaño (KIND_RULES)       │
  │                                │ INSERT media_objects (pendiente)        │
  │◄─ {uploadId, url, fields} ─────│ createPresignedPost (condiciones)       │
  │ POST multipart (fields + file) ─────────────────────────────────────────►│ aplica la política:
  │                                                                          │ tamaño y Content-Type
  │ POST /:id/complete ───────────►│ HeadObject (red interna) ──────────────►│
  │                                │ compara tamaño y tipo → lista/rechazada │
  │◄─ {id, status} ────────────────│                                         │
  │ (el formulario del aporte guarda el id del media, no la URL)             │
```

**Por qué POST firmado y no PUT:** la política del POST hace que el propio almacenamiento rechace archivos más grandes de lo permitido o con otro `Content-Type`. Con PUT, el cliente podría subir cualquier cosa.

## 3. Endpoints y plantillas

Las plantillas ya implementan este flujo:

- `server/modules/uploads/schemas.ts`: `KIND_RULES`. **Foto: jpg o png hasta 10 MB, sin compresión automática** (regla de la rama). Video, audio y documento tienen límites **provisionales** (`dominio.md`, punto 9.6). Audio incluye `audio/webm` (Chrome y Android) y `audio/mp4` (Safari e iOS).
- `server/modules/uploads/service.ts`: `createUploadIntent` exige campaña `activa`, tipo de dato solicitado por la campaña y que la persona no esté baneada en ella (probado). `completeUpload` verifica el objeto real. `getViewUrl` permite ver el archivo a su autor, a quien administra la campaña y a sus revisores aceptados.
- `server/modules/uploads/router.ts`: `POST /presign`, `POST /:id/complete` y `GET /:id/view-url`.
- `lib/upload-media.ts`: `uploadMedia(file, { campaignId, kind, onProgress })` para componentes cliente.

La cuota por persona **no** se valida al firmar la subida, sino al crear el aporte, con bloqueo (`base-de-datos.md`, sección 5).

### Aportes anónimos por enlace público

El flujo `/c/[token]` (`dominio.md`, sección 6) no tiene sesión, así que necesita endpoints propios:

1. **`POST /api/v1/c/:token/uploads/presign`:**
   - verifica que el enlace exista, no esté revocado ni vencido y que la campaña esté activa;
   - crea `media_objects` con `owner_id = null` y genera un `uploadSecret` aleatorio;
   - guarda el hash del secreto (agrega la columna cuando se implemente) y lo devuelve junto con la URL firmada.
2. **`POST /api/v1/c/:token/uploads/:id/complete`** y **`POST /api/v1/c/:token/aportes`** exigen ese `uploadSecret`. Así nadie completa ni reclama subidas ajenas.
3. **Límite estricto por IP y por token** (subidas por hora), porque es la única superficie de escritura sin cuenta.
4. **Se cuenta una visita** en `campaign_share_links.visits` al abrir la página, no en cada petición a la API.

## 4. Nombres de objetos

`campanas/{campaignId}/aportes/{uuid}.{ext}`

- **El nombre lo genera el servidor, nunca el nombre original del archivo.** Los nombres originales pueden traer datos personales y caracteres problemáticos.
- **El prefijo por campaña** permite exportar o borrar una campaña completa.
- **Si se guarda el nombre original** para mostrarlo, va en la base de datos, no en la clave del objeto.

## 5. Mostrar archivos

- **El bucket es privado.** No lo hagas público "para simplificar".
- **En Server Components,** llama a `getViewUrl(user, mediaId)` y pasa la URL resultante a `<img>`, `<audio controls>` o `<video controls playsInline>`. Las URLs duran 10 minutos; en listas largas, genéralas por página, no todas de golpe.
- **`next/image` con URLs firmadas** necesita `images.remotePatterns` apuntando al host público, y su caché puede servir una URL ya vencida. Para los aportes, usa `<img loading="lazy">` normal con dimensiones fijas.

## 6. Configuración: CORS, endpoints y proxy inverso

**Dos clientes S3** (`storage/s3.ts`):

- `s3Internal` apunta a `S3_INTERNAL_ENDPOINT` (por ejemplo, `http://minio:9000`) para las operaciones del servidor.
- `s3Public` apunta a `S3_PUBLIC_ENDPOINT` y se usa **solo para firmar**.

La firma incluye el host. Si firmas con el host interno, el navegador no puede resolverlo. Y si un proxy reescribe el host o la ruta, la firma deja de ser válida.

**CORS:** el navegador sube desde el origen de la app a otro host, así que MinIO debe permitir ese origen. En `docker-compose.yml`, `MINIO_API_CORS_ALLOW_ORIGIN` toma el valor de `APP_ORIGIN`, así que basta con mantener correcta esa variable en `.env`.

**En producción,** publica el almacenamiento en un subdominio propio (por ejemplo, `archivos.midominio.mx`) con HTTPS, detrás del proxy inverso, sin reescribir rutas. No lo publiques bajo una ruta de la app como `/storage`: con estilo de ruta, eso rompe las firmas. Si el sitio usa HTTPS y el almacenamiento no, el navegador bloquea la subida por contenido mixto.

**Credenciales:** la app siempre usa `MINIO_APP_ACCESS_KEY` y `MINIO_APP_SECRET_KEY`, también en desarrollo. Así los errores de permisos aparecen desde el principio y no al desplegar. Si un módulo necesita otra acción de S3, agrégala a la política de `setup.sh` de forma explícita y documenta el motivo.

## 7. Limpieza de subidas abandonadas

Quien sube desde el teléfono puede cerrar la pestaña a la mitad, lo que deja filas `pendiente` y objetos sueltos. Programa un job diario (por ejemplo, con `setInterval` en `server.ts` o un cron del sistema):

1. Buscar `media_objects` en estado `pendiente` con más de 24 horas.
2. Borrar el objeto con `DeleteObjectCommand`; si no existe, no pasa nada.
3. Marcar la fila como `rechazada` o borrarla.

Los archivos `lista` que no quedaron asociados a ningún aporte después de cierto tiempo se limpian con la misma lógica.

## 8. Problemas frecuentes

| Síntoma | Causa probable |
| --- | --- |
| Error CORS al subir | Origen no permitido en MinIO, o la app se abrió con una URL distinta a la configurada |
| `SignatureDoesNotMatch` | Se firmó con un host distinto al que usa el navegador, o un proxy reescribe host o ruta |
| 403 `Policy Condition failed` | El archivo supera el tamaño, o el `Content-Type` del formulario no coincide con el firmado |
| `SUBIDA_INCOMPLETA` al completar | Se llamó a `complete` antes de que terminara el POST, o el POST falló sin manejar el error |
| Funciona en la computadora pero no en el teléfono | `S3_PUBLIC_ENDPOINT=localhost` (ver `arquitectura.md`, sección 7) |
| El audio de iPhone se rechaza | Falta `audio/mp4` en `KIND_RULES`, o no se normalizó `;codecs=...` |
| La app no arranca: "El bucket no existe" o "rechazó las credenciales" | `minio-setup` falló. Revisa `docker compose logs minio-setup`; normalmente es una clave de menos de 8 caracteres o una variable faltante en `.env` |
| `AccessDenied` en una operación nueva | La política de la app no incluye esa acción; agrégala en `setup.sh` |
