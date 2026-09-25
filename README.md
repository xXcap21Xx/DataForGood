# DataForGood

Plataforma de crowdsourcing de datos: Next.js 16 (App Router) + PostgreSQL + MinIO, todo en Docker Compose.
Producción: https://multimodal-ai-lab.cicese.mx/dataforgood/

## Levantar el stack

```bash
cp .env.example .env        # y cambia TODOS los valores
docker compose up -d --build
docker compose logs -f app
```

- **Servicios:** `postgres`, `minio`, `minio-init` y `app`. `minio-init` crea el bucket privado y un usuario de MinIO limitado a ese bucket (`MINIO_ACCESS_KEY`/`MINIO_SECRET_KEY`), y termina. La app nunca recibe el root de MinIO.
- **Puertos:** Postgres y MinIO no publican puertos; solo la app publica el 3000.
- **Desarrollo en tu máquina** (`next dev` fuera de Docker, o para abrir la consola de MinIO): publica los puertos solo en `127.0.0.1` con:
  ```bash
  docker compose -f docker-compose.yml -f docker-compose.local.yml up -d
  ```
- **Subruta:** la app se publica bajo `/dataforgood` (`BASE_PATH`, se fija al construir la imagen). El proxy inverso debe reenviar la ruta **completa**, sin recortar el prefijo. En nginx: `proxy_pass http://HOST:3000;` sin `/` final.

## Migrar un servidor que ya estaba corriendo

Las credenciales viejas estaban escritas en `docker-compose.yml` y quedaron en el historial de Git: cámbialas.

1. **Postgres.** El usuario y la contraseña se graban en el volumen la primera vez que arranca, así que cambiarlos en `.env` no cambia la base existente. Hay dos caminos:
   - **Conservar el usuario y cambiar solo la contraseña.** Antes de actualizar, con el stack viejo corriendo:
     ```bash
     docker compose exec postgres psql -U tu_usuario -d mi_base_de_datos -c "ALTER USER tu_usuario PASSWORD 'nueva-clave'"
     ```
     Luego, en `.env`: `POSTGRES_USER=tu_usuario`, `POSTGRES_DB=mi_base_de_datos` y `POSTGRES_PASSWORD=nueva-clave`.
   - **Empezar con otro usuario o base:** respalda con `pg_dump`, crea el volumen nuevo y restaura.
2. **MinIO.**
   - **Credenciales:** el root sí toma las credenciales nuevas de `.env` al reiniciar. Los datos se conservan si el volumen es el mismo.
   - **Carpeta de datos:** si los datos estaban en una carpeta del host, define `MINIO_DATA=/ruta/a/esa/carpeta` en `.env`; si no, se crea un volumen nuevo y vacío.
   - **Nombres de contenedor:** los contenedores ya no tienen nombre fijo (`postgres_local`, `minio`, `app`). Usa `docker compose exec <servicio>`.
3. **Imagen de MinIO.** MinIO dejó de publicar imágenes: `quay.io/minio/minio` y `minio/minio` ya no se pueden descargar. Solo funciona si la imagen ya está en la máquina (`docker image ls | grep minio`). No borres esa imagen del servidor.
4. **Levantar:** `docker compose up -d --build`, y comprobar con `docker compose ps` que `minio-init` terminó con `Exited (0)`.

## Verificación

```bash
npx tsc --noEmit
npm run lint
docker compose up -d --build
```
