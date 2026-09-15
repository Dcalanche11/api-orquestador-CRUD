"""Integración en esquema aleatorio; nunca borra tablas del esquema public."""

import os
from pathlib import Path
from uuid import uuid4

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, inspect, select, text
from sqlalchemy.engine import make_url

from employee_api.infrastructure.config import get_settings
from employee_api.infrastructure.database import build_session_factory
from employee_api.infrastructure.models import (
    AddressModel,
    AuditModel,
    EmployeeModel,
    SalaryModel,
    UserModel,
)
from employee_api.main import create_app


@pytest.fixture
def postgres(monkeypatch, settings, hashed_password):
    url = os.getenv("TEST_DATABASE_URL")
    if not url:
        pytest.skip("Configure TEST_DATABASE_URL para ejecutar integración PostgreSQL.")
    schema = f"test_{uuid4().hex}"
    engine = create_engine(url)
    with engine.begin() as connection:
        connection.execute(text(f'CREATE SCHEMA "{schema}"'))
    test_url = make_url(url).update_query_dict({"options": f"-csearch_path={schema}"})
    database_url = test_url.render_as_string(hide_password=False)
    monkeypatch.setenv("DATABASE_URL", database_url)
    monkeypatch.setenv("JWT_SECRET", settings.jwt_secret.get_secret_value())
    get_settings.cache_clear()
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    factory = build_session_factory(database_url)
    try:
        command.upgrade(config, "head")
        with factory.begin() as session:
            session.add(UserModel(username="admin", role="HR_ADMIN", password_hash=hashed_password))
        settings.database_url = database_url
        yield factory, config, settings
    finally:
        factory.kw["bind"].dispose()
        with engine.begin() as connection:
            connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
        engine.dispose()
        get_settings.cache_clear()


@pytest.mark.postgres
def test_postgres_migrations_crud_constraints_and_audit(postgres, payload):
    factory, config, settings = postgres
    with TestClient(create_app(settings, factory)) as client:
        login = client.post(
            "/api/v1/auth/token", data={"username": "admin", "password": "test-password-only-123"}
        )
        assert login.status_code == 200, login.text
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        url = "/api/v1/employees"
        created = client.post(url, json=payload, headers=headers)
        assert created.status_code == 201, created.text
        employee_url = f"{url}/{created.json()['id']}"
        assert client.get(employee_url, headers=headers).status_code == 200
        duplicate = client.post(url, json=payload, headers=headers)
        assert duplicate.status_code == 409, duplicate.text
        assert (
            client.post(url, json=payload | {"dpi": "9876543210101"}, headers=headers).status_code
            == 409
        )
        replacement = payload | {"first_names": "María"}
        assert client.put(employee_url, json=replacement, headers=headers).status_code == 200
        updated = client.patch(
            f"{employee_url}/salary", json={"base_amount": "100.01"}, headers=headers
        )
        assert updated.status_code == 200, updated.text
        assert updated.json()["salary"]["base_amount"] == "100.01"
        summary = client.get(f"{url}/summary", headers=headers)
        assert summary.status_code == 200, summary.text
        assert summary.json()["total"] == 1
        assert summary.json()["salaries"][0]["base_total"] == "100.01"
        assert client.get(url, params={"name": "maría"}, headers=headers).json()["total"] == 1
        assert client.delete(employee_url, headers=headers).status_code == 204
        assert client.get(f"{url}/summary", headers=headers).json()["total"] == 0
    with factory() as session:
        for model in (EmployeeModel, AddressModel, SalaryModel):
            assert session.scalar(select(func.count()).select_from(model)) == 0
        assert session.scalar(select(func.count()).select_from(AuditModel)) == 4
    command.check(config)
    command.downgrade(config, "base")
    assert set(inspect(factory.kw["bind"]).get_table_names()) == {"alembic_version"}
    command.upgrade(config, "head")
    assert "employees" in inspect(factory.kw["bind"]).get_table_names()
