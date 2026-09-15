# Documento de Arquitectura de Software (SAD) - Sistema de Gestión de Empleados

## 1. Arquitectura General del Sistema
El sistema se diseña bajo los principios de **Arquitectura Limpia (Clean Architecture)** en un enfoque de Monorepo. Se separa la interfaz de usuario (Frontend SPA) de la lógica de negocio y acceso a datos (Backend API RESTful), garantizando alta cohesión, bajo acoplamiento y facilidad para realizar pruebas unitarias y de integración.

## 2. Diagrama Lógico de Componentes

```text
[ Cliente Web SPA ]
        │
        ▼ (HTTPS / REST)
[ API Gateway / Load Balancer ]
        │
        ▼
[ Capa de Presentación (Routers / Controllers) ]  <-- Validación Pydantic
        │
        ▼
[ Capa de Servicios (Casos de Uso / Dominio) ]    <-- Reglas de Negocio
        │
        ▼
[ Capa de Acceso a Datos (Repositories / ORM) ]   <-- SQLAlchemy
        │
        ▼ (TCP/IP)
[ Base de Datos Relacional (PostgreSQL) ]
```

## 3. Stack Tecnológico Recomendado
*   **Frontend:** React (Vite) con TypeScript y Tailwind CSS.
*   **Backend:** Python con FastAPI, Pydantic y SQLAlchemy.
*   **Base de Datos:** PostgreSQL 15+.
*   **Infraestructura Local:** Docker y Docker Compose.
*   **Infraestructura Cloud Recomendada:** Azure Container Apps para orquestar los contenedores, Azure API Management para exponer y asegurar los endpoints, y almacenamiento administrado.
*   **CI/CD:** Azure DevOps Pipelines para automatizar pruebas, análisis de código y despliegues.

## 4. Patrones de Diseño
*   **Repository Pattern:** Aísla la lógica de consultas SQL del resto de la aplicación.
*   **Dependency Injection:** Inyección de sesiones de base de datos y dependencias de seguridad a nivel de rutas.
*   **Data Transfer Object (DTO):** Uso estricto de esquemas (Pydantic) para serialización de entrada y salida.

## 5. Estrategia de Seguridad y Autenticación
*   **Autenticación:** Implementación de JSON Web Tokens (JWT) asimétricos o simétricos.
*   **Autorización (RBAC):** Control de acceso basado en roles (ej. HR_ADMIN, EMPLOYEE_VIEWER).
*   **Auditoría de Datos Sensibles:** En entornos regulados o instituciones financieras, el manejo de información salarial exige una bitácora de auditoría estricta. Todo cambio (CREATE, UPDATE, DELETE) debe registrar quién, cuándo y qué campos modificó.
*   **Protección de Endpoints:** Rate limiting y validación de orígenes (CORS).

## 6. Modelo de Comunicación y APIs
Comunicación síncrona vía HTTP/REST.

*   `GET /api/v1/employees` (Paginación, filtros por nombre o DPI)
*   `POST /api/v1/employees` (Payload transaccional: Empleado + Salario + Direcciones)
*   `GET /api/v1/employees/{id}` (Ficha completa)
*   `PUT /api/v1/employees/{id}` (Actualización total)
*   `PATCH /api/v1/employees/{id}/salary` (Actualización específica, requiere rol elevado)

## 7. Estrategia de Base de Datos
PostgreSQL manejará relaciones fuertes, garantizando atomicidad y consistencia (ACID). Las tablas principales incluyen `employees`, `addresses`, y `salary_information`. La gestión de cambios en el esquema se realizará obligatoriamente mediante herramientas de migración (ej. Alembic).

## 8. Consideraciones de Escalabilidad
*   El backend stateless permite escalar horizontalmente replicando contenedores detrás de un balanceador de carga.
*   Las conexiones a la base de datos deben gestionarse mediante un *Connection Pool*.

## 9. Reglas Técnicas para el Equipo
*   **Product Manager (PM):** Estructurar el ciclo de vida del proyecto utilizando metodologías ágiles como Scrum o Kanban, guiando la definición de requerimientos bajo estándares claros (apoyándose en marcos como PMBOK 7 para la gestión de cronogramas y riesgos).
*   **Frontend Dev:** Estricto tipado con TypeScript. Cero lógica de negocio compleja en la vista; delegar cálculos al backend (como la edad).
*   **Backend Dev:** Cobertura de pruebas unitarias >80% utilizando Pytest. Ningún endpoint expone trazas de error de base de datos.
*   **CI/CD Dev:** Configurar PRs (Pull Requests) con validaciones obligatorias (linting, tests) antes del merge a la rama principal en Azure DevOps.
