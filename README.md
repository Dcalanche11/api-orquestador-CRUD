# PDGE · Plataforma de Gestión de Empleados

Aplicación de gestión de empleados con backend REST y frontend React, siguiendo
el documento de arquitectura proporcionado. Incluye autenticación, roles y CRUD completo.

## Estructura

```text
backend/
  src/employee_api/
    domain/          # Entidades, cálculo de edad, errores y contratos
    application/     # Casos de uso y límites de transacción
    infrastructure/  # SQLAlchemy, repositorios, JWT, configuración y CLI
    api/             # Rutas HTTP, DTO Pydantic y dependencias
  migrations/        # Historial Alembic
  tests/             # Pruebas de reglas, API y PostgreSQL
frontend/src/        # Aplicación React + TypeScript + Tailwind
docs/                # Arquitectura, contrato OpenAPI y ejemplos
infra/azure/         # Lineamientos para la futura infraestructura cloud
scripts/             # Configuración, pruebas y exportación Docker
packaging/portable/  # Plantillas de instalación de los paquetes portables
compose.yaml         # Frontend, API, migración, PostgreSQL y Redis
azure-pipelines.yml  # Lint, formato, pruebas y cobertura
```

## Ejecutar con Docker

Desde la raíz del repositorio, con Docker Desktop iniciado:

```sh
# Solo la primera vez; conserva .env si ya existe.
python3 scripts/init_env.py
docker compose up -d --build
docker compose exec api employee-admin admin --role HR_ADMIN
```

El último comando pide y confirma una contraseña de al menos 12 caracteres; no
hay usuarios ni claves de acceso predeterminados. Para crear un usuario de lectura:

```sh
docker compose exec api employee-admin consulta --role EMPLOYEE_VIEWER
```

Abrir [la aplicación web](http://localhost:5173) e iniciar sesión con el usuario creado.
La [guía del frontend](frontend/README.md) explica el desarrollo y las pruebas.

También puede abrir [Swagger UI](http://localhost:8000/docs), pulsar **Authorize**, ingresar el
usuario/contraseña creados y probar los endpoints. Los campos client_id/client_secret
no son necesarios. [OpenAPI](http://localhost:8000/openapi.json) contiene el contrato completo.

La migración se ejecuta antes de iniciar la API. La base se conserva en el volumen
`employee-management_postgres_data`. La API usa el puerto 8000 y PostgreSQL 55432,
ambos publicados solo en `127.0.0.1`. Redis se utiliza dentro de la red de Docker.

```sh
docker compose ps
docker compose logs api migrate
docker compose stop
docker compose start db redis api web
```

Para aplicar una migración nueva después de modificar el código:

```sh
docker compose build
docker compose run --rm migrate
docker compose up -d api
```

## Desarrollo y pruebas

Para desarrollo local, use Python 3.14 y Node.js 22.12 o superior. En macOS/Linux:

```sh
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements-dev.txt
backend/.venv/bin/python -m pip install --no-deps -e backend
```

Los archivos `requirements*.txt` fijan las versiones resueltas y probadas; el
`pyproject.toml` define los rangos permitidos para futuras actualizaciones.

Pruebas rápidas sin servicios externos:

```sh
cd backend
.venv/bin/pytest -q
.venv/bin/ruff check . ../scripts
.venv/bin/ruff format --check . ../scripts
```

La integración PostgreSQL se omite en esa ejecución si no existe `TEST_DATABASE_URL`.
Para ejecutar la suite completa desde la raíz:

```sh
docker compose up -d --wait db redis
backend/.venv/bin/python scripts/test_postgres.py
```

La prueba PostgreSQL crea un esquema temporal aleatorio, aplica las migraciones,
prueba el CRUD y verifica `upgrade → downgrade → upgrade`. El esquema temporal se
elimina al finalizar; no modifica las tablas de la aplicación en `public`.

Para ejecutar Python directamente, detener primero el frontend y la API Docker para liberar los puertos:

```sh
docker compose stop web api
backend/.venv/bin/alembic -c backend/alembic.ini upgrade head
backend/.venv/bin/uvicorn employee_api.main:create_app --factory --reload --no-access-log
```

Estos comandos se ejecutan desde la raíz para leer `.env`. El modo nativo usa el
rate limiter en memoria configurado allí; Docker usa Redis compartido. Las variables
de entorno tienen prioridad sobre `.env`.

## API y permisos

| Método | Ruta | Permiso |
| --- | --- | --- |
| POST | `/api/v1/auth/token` | Credenciales válidas; devuelve JWT |
| GET | `/api/v1/auth/me` | Perfil y rol del usuario autenticado |
| GET | `/api/v1/employees?offset=0&limit=20&name=Ana&dpi=1234567890101` | Ambos roles |
| GET | `/api/v1/employees/summary` | Ambos roles; resumen global del dashboard |
| GET | `/api/v1/employees/{id}` | Ambos roles |
| POST | `/api/v1/employees` | HR_ADMIN |
| PUT | `/api/v1/employees/{id}` | HR_ADMIN |
| PATCH | `/api/v1/employees/{id}/salary` | HR_ADMIN |
| DELETE | `/api/v1/employees/{id}` | HR_ADMIN |
| GET | `/health/live`, `/health/ready` | Público |

`EMPLOYEE_VIEWER` es un rol interno de RR. HH. de solo lectura: puede consultar todas
las fichas, incluidos salarios. No representa a un empleado con acceso solo a sus
propios datos. La creación, modificación y eliminación están restringidas a HR_ADMIN.

El listado permite paginación hasta 100 registros, búsqueda parcial por nombre completo
sin distinguir mayúsculas y filtro exacto por DPI. El orden es apellido, nombre e ID.
No existe filtro de eliminación de acentos. PUT reemplaza todos los datos editables;
PATCH modifica únicamente los campos salariales enviados. DELETE elimina empleado,
direcciones y salario, y conserva la auditoría.

Respuestas principales: 201 al crear, 200 al consultar/editar, 204 al borrar, 401 sin
autenticación, 403 sin permiso, 404 inexistente, 409 DPI/NIT duplicado, 422 datos
inválidos, 429 exceso de solicitudes y 503 ante errores de base de datos.

## Tecnologías y diseño

React 19, Vite 7, TypeScript, Tailwind CSS 4, TanStack Query, React Hook Form,
Montserrat, Nginx, Playwright y ESLint. Backend: Python 3.14, FastAPI, Pydantic 2, SQLAlchemy 2, Psycopg 3, PostgreSQL 17, Alembic,
PyJWT, Argon2, SlowAPI, Redis 7, Pytest, Ruff y Docker Compose. Ver versiones exactas
en `backend/requirements.txt` y `backend/requirements-dev.txt`.

Los casos de uso dependen de contratos del dominio, no del ORM ni de FastAPI.
Los repositorios traducen las entidades a SQLAlchemy y una unidad de trabajo
confirma conjuntamente empleado, direcciones, salario y bitácora. Las actualizaciones
bloquean la fila del empleado durante la transacción en PostgreSQL.

La autenticación usa JWT HS256 con expiración, emisor y audiencia; Argon2 protege
contraseñas. El rol y el estado activo se consultan en la base en cada solicitud.
Los límites son 100 solicitudes por minuto por IP y endpoint, y 5 intentos de login
por minuto por IP. CORS admite orígenes explícitos.

Referencias técnicas: [JWT en FastAPI](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/)
y [sesiones/transacciones en SQLAlchemy](https://docs.sqlalchemy.org/en/20/orm/session_basics.html).

## Documentación y alcance

- [Arquitectura del sistema](docs/Arquitectura_Sistema.md).
- [Payload de ejemplo](docs/employee-example.json).
- [Pruebas con Postman y consultas de base de datos](postman/README.md).
- [Distribución e instalación con Docker](packaging/README.md).
- [Preparación para Azure](infra/azure/README.md).

Repositorio: [Dcalanche11/api-orquestador-CRUD](https://github.com/Dcalanche11/api-orquestador-CRUD).
El código no incluye credenciales ni datos reales de empleados; los ejemplos y pruebas
usan datos ficticios. Las contraseñas presentes en las pruebas sirven únicamente
para bases temporales aisladas. El alojamiento de la aplicación en cloud no está configurado.
El pipeline de Azure está preparado; las políticas de validación se configuran en Azure Repos.

## Interfaz PDGE

PDGE (Plataforma de Gestión de Empleados) ofrece dos vistas en la sección Empleados: Tabla, con filtros y apertura de ficha al pulsar una fila (o Enter/Espacio con el teclado), y Dashboard, con totales globales, afiliaciones IGSS/IRTRA, direcciones, distribución por género y resumen salarial. El usuario, su rol y el cierre de sesión están en la esquina superior derecha.

El dashboard consulta `GET /api/v1/employees/summary`; incluye todos los empleados independientemente de la paginación o los filtros de la tabla. Los importes se agregan en el backend y se separan por moneda y frecuencia de pago. Las afiliaciones indican que existe un número registrado. Las direcciones cuentan cada dirección registrada, incluso si un empleado tiene varias. No requiere migraciones de base de datos.

## Ejecutar sin compilar

Los paquetes portables contienen las imágenes Docker y las instrucciones para iniciar
PDGE en un equipo nuevo, con una base vacía y credenciales propias. Se generan
por separado para Intel/AMD (`amd64`) y Apple Silicon (`arm64`).
Consulte [la guía de distribución](packaging/README.md).
