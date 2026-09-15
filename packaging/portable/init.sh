#!/bin/sh
set -eu
cd "$(dirname "$0")"
if [ -e .env ]; then
  echo 'Se conserva el archivo .env existente.'
  exit 0
fi
umask 077
task_env=$(mktemp .env.XXXXXX)
trap 'rm -f "$task_env"' EXIT HUP INT TERM
if docker run --rm -i --pull=never --platform linux/@ARCH@ --entrypoint python pdge-api:@VERSION@-@ARCH@ - < init-env.py > "$task_env"; then
  # El enlace falla si otro proceso ya creó .env; no se sobrescriben credenciales.
  ln "$task_env" .env
  echo 'Configuración nueva creada en .env.'
else
  echo 'No se pudo generar la configuración. Cargue primero images.tar.gz con docker load.' >&2
  exit 1
fi
