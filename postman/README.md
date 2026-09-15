# Pruebas manuales con Postman y PostgreSQL

## 1. Estado de la base

Al revisar la base antes de estas pruebas, las cinco tablas tenían **0 registros**:
`employees`, `addresses`, `salary_information`, `users` y `audit_logs`.
El esquema sí existe y la API, PostgreSQL y Redis están activos en Docker.
No hay datos de demostración ni usuarios iniciales. Este es un diagnóstico puntual;
los conteos cambiarán al crear usuarios o ejecutar la colección.
La tabla técnica `alembic_version` guarda la versión de migración aplicada; no
representa empleados o datos de demostración.

## 2. Ver las tablas desde Terminal

Ejecute estos comandos desde la raíz del proyecto, donde está `compose.yaml`:

```sh
docker compose ps
docker compose exec db psql -U employees -d employees
```

Dentro de `psql`:

```sql
\dt
\d employees
SELECT id, username, role, is_active FROM users;
SELECT * FROM employees;
SELECT * FROM addresses;
SELECT * FROM salary_information;
SELECT * FROM audit_logs;
\q
```

`\dt` muestra tablas; `\d employees` muestra columnas y restricciones; `\q` sale.
La edad no es una columna de `employees`: el backend la calcula al devolver la ficha.
Para ver todas las consultas preparadas sin entrar al modo interactivo:

```sh
docker compose exec -T db psql -U employees -d employees < postman/sql/01_inspeccionar_tablas.sql
```

También hay consultas de ficha y auditoría por UUID en `sql/02_ficha_y_auditoria.sql`.
El ID se obtiene de `employee_id` en Postman; después de eliminar queda en
`deleted_employee_id`. La auditoría continúa visible después del DELETE.

## 3. Conexión desde un cliente gráfico PostgreSQL

Si usa un cliente de bases de datos, configure una conexión PostgreSQL con:

| Campo | Valor local |
| --- | --- |
| Host | `127.0.0.1` |
| Puerto | `55432` |
| Base de datos | `employees` |
| Usuario de base de datos | `employees` |
| Contraseña | Valor de `POSTGRES_PASSWORD` en `.env` de la raíz |
| SSL | Desactivado para este PostgreSQL local |
| Esquema | `public` |

La contraseña de PostgreSQL es distinta a la del usuario de la API. No copie el
contenido de `.env` a la colección. Si cambió los parámetros de Docker, use los
valores vigentes de `.env`. Postman se conecta a la API en el puerto 8000; las
consultas SQL se ejecutan con `psql` o su cliente PostgreSQL.

## 4. Crear el acceso a la API

Crear el administrador una sola vez:

```sh
docker compose exec api employee-admin admin --role HR_ADMIN
```

Ingrese una contraseña de al menos 12 caracteres y confírmela. No se muestra
mientras escribe. El comando almacena el hash, no la contraseña en texto plano.
Si el usuario ya existe, utilice sus credenciales; no vuelva a crearlo.

Para verificar además los permisos de solo lectura, cree opcionalmente:

```sh
docker compose exec api employee-admin consulta --role EMPLOYEE_VIEWER
```

`users` contiene accesos a la API. `employees` contiene las fichas de empleados.
Crear un usuario no crea un empleado, y crear un empleado no crea un usuario.
HR_ADMIN puede realizar todo el CRUD. EMPLOYEE_VIEWER puede ver todas las fichas,
incluido el salario, pero no puede modificarlas.

Solo se necesita el usuario y su contraseña para obtener un JWT. No se necesitan
API key, client_id, client_secret ni un token generado manualmente. El login se
envía a `/api/v1/auth/token` como **x-www-form-urlencoded**. Los demás endpoints
reciben `Authorization: Bearer <token>`; la colección lo configura automáticamente.
El token dura 30 minutos: si caduca, vuelva a ejecutar el login.

## 5. Importar los archivos en Postman

1. Abra la aplicación de escritorio Postman y use **Import**.
2. Seleccione estos dos archivos:
   - `collections/Empleados.postman_collection.json`
   - `environments/Local.postman_environment.json`
3. Seleccione el environment **Empleados — Local**.
4. Configure los valores locales de `admin_username` y `admin_password` con las
   credenciales que creó. `admin_username` propone `admin`; la contraseña viene vacía.
5. Si creó el usuario de consulta, configure también `viewer_username` y
   `viewer_password`. Sin esas credenciales se omite la carpeta opcional de permisos.

La carpeta ya contenía una configuración de Postman Local View, que se conserva.
Estos archivos son exportaciones JSON v2.1 para importar; si su vista local no los
registra automáticamente, use Import. No es necesario modificar `.postman/resources.yaml`.

Los campos de contraseña y tokens están marcados como secretos en la plantilla.
Mantenga los valores reales locales en Postman y no los publique en el repositorio.
El tipo secreto oculta el valor en la interfaz; no sustituye el control de lo que
se comparte o exporta. Las plantillas entregadas no contienen credenciales.

## 6. Recorrido recomendado para observar la base

Ejecute las solicitudes con **Send**, en este orden:

| Paso | Solicitud | Resultado esperado |
| --- | --- | --- |
| 1 | `00 Salud y contrato` | API y base disponibles; contrato OpenAPI |
| 2 | `01 Login administrador` | 200 y variable `admin_access_token` guardada |
| 3 | `02 Crear empleado` | 201 y variable `employee_id` guardada |
| 4 | Consultar las tablas por SQL | 1 empleado, 1 dirección, 1 salario y 1 evento CREATE nuevos |
| 5 | `03` a `05`: listado, filtros y ficha | 200; aparece el empleado creado |
| 6 | `06 Reemplazar ficha (PUT)` | 200; nombre/dirección modificados y salario base 7000.00 |
| 7 | `07 Actualizar salario (PATCH)` | 200; base 7500.25 y bonificación 300.00 |
| 8 | `08 Confirmar cambios persistidos` | 200; confirma nombre y salario guardados |
| 9 | Consultar auditoría por SQL | CREATE y dos UPDATE; campos salariales identificados |
| 10 | `20 Validaciones y errores esperados` | 401, 409 y 422 son los resultados correctos |
| 11 | `30 Permisos de consulta` (opcional) | GET permitido; POST/PUT/PATCH/DELETE devuelven 403 |
| 12 | `90 Eliminar ficha de prueba` | DELETE 204 y consulta posterior 404 |

**Para conservar el empleado y verlo en la base, deténgase antes de la carpeta 90.**
Al eliminar, se borran también direcciones y salario; los usuarios y cuatro eventos
de auditoría del recorrido completo permanecen. Las solicitudes rechazadas no generan
eventos CREATE/UPDATE/DELETE. Los conteos anteriores suponen un solo recorrido exitoso.

CREATE genera DPI y NIT ficticios nuevos en cada envío para evitar colisiones en
pruebas repetidas. Repetir CREATE crea otro empleado y cambia `employee_id` al nuevo;
no elimina los creados en envíos anteriores. La colección no es una carga masiva.

PUT envía todos los campos editables; PATCH envía solo los campos salariales deseados.
Los DTO de escritura no aceptan `id`, `age`, `created_at` ni `updated_at`.

## 7. Ejecutar toda la colección con Runner

Seleccione la colección, use **Run**, elija **Empleados — Local** y ejecute una
iteración con el orden original. Las pruebas aparecen en los resultados de la
ejecución y en **Test Results** de cada solicitud. El recorrido incluye 28 solicitudes
si configura ambos roles; las 7 de consulta se omiten si deja su contraseña vacía.

Un recorrido completo **crea, modifica y elimina** la ficha de prueba. Puede
deseleccionar la carpeta 90 para conservarla y revisarla en SQL. Ejecute primero el
flujo principal antes de las validaciones o las pruebas de permisos que usan su ID.
En Runner, conserve los cambios de variables si desea reutilizar después el token
o los identificadores en solicitudes individuales.

No se renueva el JWT antes de cada solicitud. Si hace más de cinco logins por minuto
desde la misma IP, recibirá 429; espere un minuto y vuelva a iniciar sesión.

## 8. Problemas habituales

- **ECONNREFUSED:** inicie Docker Desktop y ejecute `docker compose up -d`.
- **401 al hacer login:** compruebe que creó el usuario y escribió la misma contraseña.
- **401 en el CRUD:** seleccione el environment correcto y vuelva a ejecutar login.
- **403 al escribir:** use las solicitudes del administrador; el rol de consulta no escribe.
- **409 al crear:** ya existe ese DPI o NIT. Use la solicitud CREATE, que genera nuevos valores.
- **422:** revise el cuerpo; importes no negativos con máximo dos decimales, DPI de
  13 dígitos y al menos una dirección. La carpeta 20 provoca varios 422 intencionales.
- **404 después de borrar:** es el comportamiento esperado.
- **Sin datos al terminar Runner:** ejecutó DELETE; revise la auditoría o repita
  CREATE y omita la carpeta 90.

## Verificación de esta entrega

Colección ejecutada con Newman 6 contra la API y PostgreSQL en un esquema temporal:

| Recorrido | Solicitudes ejecutadas | Comprobaciones | Fallos |
| --- | --- | --- | --- |
| Administrador y consulta | 28 | 40 | 0 |
| Solo administrador; consulta omitida | 21 | 32 | 0 |

El servidor y el esquema temporales se retiraron al terminar. Estas verificaciones
no poblaron las tablas de la aplicación. Newman se ejecutó en un contenedor temporal;
no se instaló Node.js globalmente en la MacBook.

Referencias oficiales: [importación de datos](https://learning.postman.com/docs/getting-started/importing-and-exporting/importing-and-exporting-overview),
[variables en scripts](https://learning.postman.com/docs/tests-and-scripts/write-scripts/postman-sandbox-reference/pm-variables)
y [Collection Runner](https://learning.postman.com/docs/tests-and-scripts/running-collections/intro-to-collection-runs).
