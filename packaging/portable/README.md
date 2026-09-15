# PDGE @VERSION@ — paquete para @ARCH@

Plataforma de Gestión de Empleados. Contiene las imágenes Linux del frontend,
API, PostgreSQL y Redis, listas para cargarse en Docker. No incluye empleados,
usuarios, contraseñas ni volúmenes del equipo de origen.

## Requisitos

Docker Desktop iniciado en Windows/macOS (contenedores Linux; WSL 2 en Windows),
o Docker Engine con el complemento Compose v2 en Linux. No es necesario instalar
Python, Node.js, npm ni PostgreSQL en el equipo receptor. Después de cargar las
imágenes, el arranque de la aplicación no necesita descargar dependencias.

- `amd64`: Windows/Linux Intel o AMD de 64 bits y Mac Intel.
- `arm64`: Mac con Apple Silicon y Linux/Windows ARM64 con Docker compatible.

Use el paquete correspondiente al procesador. Para comprobar la arquitectura del
motor Docker: `docker info --format '{{.Architecture}}'` (`x86_64` = amd64,
`aarch64` = arm64).

## Iniciar

Descomprima el ZIP y abra una terminal en la carpeta extraída. Primero cargue las imágenes:

```sh
docker load --input images.tar.gz
```

Genere las credenciales internas (solo la primera vez):

**macOS o Linux**

```sh
sh init.sh
```

**Windows PowerShell**

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1
```

Este comando permite ejecutar únicamente esa invocación del script local; no cambia
la política persistente de PowerShell. También puede usar PowerShell 7 (`pwsh`).
Ambos scripts conservan `.env` si ya existe. Guarde ese archivo junto al volumen;
no lo envíe a GitHub ni lo regenere para una base de datos existente.

Inicie los servicios y cree su usuario administrador:

```sh
docker compose up -d --wait
docker compose exec api employee-admin admin --role HR_ADMIN
```

El último comando solicita una contraseña de al menos 12 caracteres y su confirmación.
Abra **http://localhost:5173** e ingrese con ese usuario. Swagger: http://localhost:8000/docs.
La base de datos se crea vacía y las migraciones se aplican automáticamente.

Usuario opcional de solo lectura:

```sh
docker compose exec api employee-admin consulta --role EMPLOYEE_VIEWER
```

## Uso posterior

```sh
docker compose ps
docker compose logs api migrate
docker compose stop
docker compose up -d --wait
```

Los datos persisten en el volumen `pdge_postgres_data`. `docker compose down`
detiene y elimina los contenedores, pero conserva ese volumen. No agregue `-v`
si quiere conservar los empleados registrados.

Si los puertos están ocupados, añada `WEB_PORT=5175` y/o `API_PORT=8005` a `.env`
y vuelva a ejecutar `docker compose up -d --wait`. Abra el puerto que haya elegido.
Los puertos se publican únicamente en el equipo local. Este paquete es para
revisión o uso local; no configura alojamiento público con HTTPS.

## Integridad

`SHA256SUMS.txt` permite verificar los archivos del paquete:

- macOS: `shasum -a 256 -c SHA256SUMS.txt`
- Linux: `sha256sum -c SHA256SUMS.txt`
- PowerShell: `Get-FileHash images.tar.gz -Algorithm SHA256` y comparar con el archivo.

`images.json` identifica las imágenes incluidas. El código fuente se distribuye
por separado en el repositorio de PDGE. Para trasladar también una base ya poblada
se necesita un respaldo y restauración de PostgreSQL, que no forma parte de este paquete.
