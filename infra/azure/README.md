# Despliegue cloud — pendiente

Destino recomendado por el documento de arquitectura: Azure Container Apps,
Azure API Management y PostgreSQL administrado. El pipeline de validación está
en `azure-pipelines.yml`; no se han creado recursos ni conexiones cloud.

Antes de desplegar: configurar Key Vault/secretos, TLS, orígenes CORS, conexión
PostgreSQL con TLS, usuario de ejecución con permisos mínimos separado del usuario
de migraciones, Redis compartido para rate limiting y política de conservación de
auditoría. El usuario de ejecución deberá tener solo INSERT/SELECT sobre audit_logs.

Al integrar el gateway, confiar en cabeceras de proxy solo desde sus IP conocidas.
La configuración local desactiva la confianza en X-Forwarded-For; así no se puede
evadir el límite falsificando esa cabecera. Aplicar también límites en API Management.

Azure Repos requiere configurar en la rama principal una política **Build Validation**
obligatoria que use este pipeline. Un archivo YAML por sí solo no impone esa política.
