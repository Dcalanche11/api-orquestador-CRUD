# Distribución de PDGE con Docker

Los paquetes portables permiten ejecutar PDGE sin instalar Node.js, Python ni
PostgreSQL en el equipo receptor. Requieren Docker con Compose v2 y contienen
cuatro imágenes: API (también ejecuta migraciones), frontend, PostgreSQL y Redis.

## Generar las entregas

Desde la raíz, con Docker iniciado y Python 3.12 o superior:

```sh
python3 scripts/export_docker.py --arch both --version 1.0.0
```

Docker debe permitir construir `linux/amd64` y `linux/arm64` (Docker Desktop en
Apple Silicon permite ambas). La construcción descarga dependencias oficiales.
También se puede exportar solo una arquitectura con `--arch amd64` o `--arch arm64`.
Cada destino debe ser nuevo: el script evita sobrescribir una entrega existente.

Se generan en `exports/`, excluido de Git:

- `pdge-1.0.0-amd64.zip`: Windows/Linux Intel o AMD y Mac Intel.
- `pdge-1.0.0-arm64.zip`: Apple Silicon y otros sistemas ARM64 con Docker compatible.

Cada ZIP contiene `images.tar.gz`, un `compose.yaml` sin instrucciones de build,
scripts para generar credenciales nuevas, metadatos, sumas SHA-256 e instrucciones.
Las imágenes se exportan con `docker image save`; se cargan con `docker image load`.
[Documentación de Docker](https://docs.docker.com/reference/cli/docker/image/save/).

No se exportan los volúmenes, usuarios, fichas, `.env` ni sesiones del equipo origen.
No se incrustan contraseñas predeterminadas. Cada receptor genera sus secretos
y crea su administrador al instalar. La licencia OFL-1.1 de Montserrat se incluye en cada paquete como `Montserrat-OFL.txt`.

## Entregar

Comparta el ZIP correspondiente y solicite seguir su `README.md`.
Los ZIP son artefactos de entrega, no archivos para subir mediante Git. Pueden
adjuntarse a una versión en GitHub Releases o compartirse por el medio elegido.

La aplicación se sirve en localhost. Publicar el repositorio no publica la aplicación
ni la base de datos en Internet. Trasladar datos reales requeriría un respaldo de
PostgreSQL y un proceso adicional de restauración.
