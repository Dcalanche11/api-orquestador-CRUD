from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from employee_api.api.routes import build_router
from employee_api.domain.errors import AuthenticationError, ConflictError, NotFoundError
from employee_api.infrastructure.config import Settings, get_settings
from employee_api.infrastructure.database import build_session_factory


def create_app(settings: Settings | None = None, session_factory=None) -> FastAPI:
    settings = settings or get_settings()
    factory = session_factory or build_session_factory(settings.database_url.get_secret_value())

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        yield
        if session_factory is None:
            factory.kw["bind"].dispose()

    app = FastAPI(
        title="Gestión de Empleados",
        version="0.1.0",
        lifespan=lifespan,
        description="CRUD transaccional de empleados, direcciones y salarios.",
    )
    app.state.settings = settings
    app.state.session_factory = factory
    app.state.limiter = Limiter(
        key_func=get_remote_address,
        default_limits=[settings.request_rate_limit],
        storage_uri=settings.rate_limit_storage_uri,
    )
    app.add_middleware(SlowAPIMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    @app.middleware("http")
    async def sensitive_response_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    @app.exception_handler(NotFoundError)
    async def not_found(request: Request, exc: NotFoundError):
        return JSONResponse(status_code=404, content={"detail": str(exc)})

    @app.exception_handler(ConflictError)
    async def conflict(request: Request, exc: ConflictError):
        return JSONResponse(status_code=409, content={"detail": str(exc)})

    @app.exception_handler(AuthenticationError)
    async def unauthorized(request: Request, exc: AuthenticationError):
        return JSONResponse(
            status_code=401, content={"detail": str(exc)}, headers={"WWW-Authenticate": "Bearer"}
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError):
        # No reflejar contraseñas, salarios, DPI u otros valores de entrada en los errores.
        errors = [{"loc": list(e["loc"]), "msg": e["msg"], "type": e["type"]} for e in exc.errors()]
        return JSONResponse(status_code=422, content={"detail": errors})

    @app.exception_handler(SQLAlchemyError)
    async def database_error(request: Request, exc: SQLAlchemyError):
        return JSONResponse(status_code=503, content={"detail": "Servicio de datos no disponible."})

    @app.get("/health/live", tags=["Salud"])
    def live():
        return {"status": "ok"}

    @app.get("/health/ready", tags=["Salud"])
    def ready():
        with factory() as session:
            session.execute(text("SELECT 1"))
        return {"status": "ok"}

    app.include_router(build_router(app.state.limiter, settings))
    return app
