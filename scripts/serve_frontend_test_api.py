"""API exclusiva de Playwright: SQLite temporal, nunca utiliza la base de .env."""

import secrets
import tempfile
from pathlib import Path

import uvicorn
from employee_api.infrastructure.config import Settings
from employee_api.infrastructure.database import Base
from employee_api.infrastructure.models import UserModel
from employee_api.infrastructure.security import password_hasher
from employee_api.main import create_app
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

with tempfile.TemporaryDirectory(prefix="pdge-e2e-") as directory:
    engine = create_engine(f"sqlite:///{Path(directory) / 'test.db'}")

    @event.listens_for(engine, "connect")
    def foreign_keys(connection, record):
        connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    factory = sessionmaker(engine, expire_on_commit=False)
    with factory.begin() as session:
        for username, role in (
            ("e2e-admin", "HR_ADMIN"),
            ("e2e-viewer", "EMPLOYEE_VIEWER"),
        ):
            session.add(
                UserModel(
                    username=username,
                    role=role,
                    password_hash=password_hasher.hash("e2e-only-password-123"),
                )
            )
    settings = Settings(
        _env_file=None,
        database_url="sqlite://",
        jwt_secret=secrets.token_hex(32),
        rate_limit_storage_uri="memory://",
        request_rate_limit="10000/minute",
        login_rate_limit="10000/minute",
    )
    uvicorn.run(
        create_app(settings, factory), host="127.0.0.1", port=8001, access_log=False
    )
    engine.dispose()
