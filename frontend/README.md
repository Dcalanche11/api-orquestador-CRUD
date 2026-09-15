# PDGE · Frontend

React, Vite, TypeScript estricto y Tailwind CSS. Incluye acceso por rol, directorio,
filtros y paginación, ficha, formularios con varias direcciones, edición salarial
y eliminación con confirmación. La edad y las reglas de negocio provienen de la API.

## Abrir la aplicación

Desde la raíz: `docker compose up -d --build`. Abrir
[localhost:5173](http://localhost:5173) con las mismas credenciales de Swagger/Postman.
HR_ADMIN administra; EMPLOYEE_VIEWER consulta. El backend valida cada permiso.

Para desarrollar con Vite, detener `web` y ejecutar desde `frontend`:

```sh
npm ci
npm run dev
```

Vite utiliza 127.0.0.1:5173 y redirige `/api` a 127.0.0.1:8000. `API_PROXY_TARGET`
permite cambiar el destino. En Docker, Nginx sirve la SPA y conecta con el servicio `api`.

## Identidad visual

Paleta inspirada en el logo AGEXPORT Guatemala proporcionado: azul intenso
`#110B99`, marino `#0B1D61`, negro `#232323`, blanco y fondos azules suaves.
Son aproximaciones tomadas de la imagen, no una especificación oficial de marca.

Se usa **Montserrat Variable** como aproximación geométrica al texto del logo;
la imagen no permite certificar su fuente original. La fuente se distribuye localmente
con `@fontsource-variable/montserrat`, licencia OFL-1.1, sin depender de Google Fonts.
Ver [Fontsource](https://fontsource.org/fonts/montserrat/install).

## Organización y sesión

- `src/app`: sesión y navegación.
- `src/features/employees`: directorio, ficha y formularios.
- `src/services`: HTTP, errores y formato de presentación.
- `src/components`: controles y estados compartidos.
- `src/types`: contratos derivados del OpenAPI.

TanStack Query gestiona consultas y React Hook Form los formularios. El JWT se guarda
en sessionStorage por pestaña; al cerrar sesión o recibir 401 se elimina y se limpia
la caché. No se guarda la contraseña. `/api/v1/auth/me` proporciona el usuario y rol.

## Verificación

```sh
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

En esta MacBook puede usarse Chrome instalado: `PW_CHANNEL=chrome npm run test:e2e`.
Playwright inicia una API de pruebas en 8001 y Vite en 5174 con SQLite temporal;
no utiliza `.env` ni modifica PostgreSQL. Requiere `backend/.venv` preparado.
`E2E_PYTHON` permite indicar otro Python con las dependencias del backend.

Los cuatro recorridos cubren CRUD, permisos, validaciones, sesión, paginación y móvil.
Para regenerar tipos, ejecutar desde la raíz:

```sh
backend/.venv/bin/python scripts/export_openapi.py
npm --prefix frontend run types:api
```
