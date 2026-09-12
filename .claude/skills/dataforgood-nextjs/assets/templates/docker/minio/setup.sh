#!/bin/sh
# Configuración inicial de MinIO (idempotente). La ejecuta el servicio minio-setup.
set -eu

: "${S3_BUCKET:?Falta S3_BUCKET}"
: "${MINIO_APP_ACCESS_KEY:?Falta MINIO_APP_ACCESS_KEY}"
: "${MINIO_APP_SECRET_KEY:?Falta MINIO_APP_SECRET_KEY}"

export MC_CONFIG_DIR=/tmp/.mc
mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" --api S3v4 >/dev/null

i=0
until mc ready local >/dev/null 2>&1; do
  i=$((i + 1))
  [ "$i" -ge 60 ] && { echo "MinIO no respondió a tiempo"; exit 1; }
  sleep 2
done

# Bucket privado: los aportes pueden contener rostros o voces de personas.
mc mb --ignore-existing "local/$S3_BUCKET"
mc anonymous set none "local/$S3_BUCKET"

# Política mínima para la app: listar el bucket y leer/escribir/borrar objetos, nada más.
cat > /tmp/dataforgood-app.json <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Action": ["s3:GetBucketLocation", "s3:ListBucket"], "Resource": ["arn:aws:s3:::$S3_BUCKET"] },
    { "Effect": "Allow", "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"], "Resource": ["arn:aws:s3:::$S3_BUCKET/*"] }
  ]
}
POLICY
mc admin policy create local dataforgood-app /tmp/dataforgood-app.json

# Usuario IAM normal (no una service account derivada del root): así la app nunca tiene más
# permisos que esta política, y no depende de las restricciones de sesión afectadas por CVE-2025-62506.
mc admin user add local "$MINIO_APP_ACCESS_KEY" "$MINIO_APP_SECRET_KEY"
mc admin policy attach local dataforgood-app --user "$MINIO_APP_ACCESS_KEY" 2>/dev/null || true

echo "MinIO listo: bucket '$S3_BUCKET' privado y usuario de la app configurado"
