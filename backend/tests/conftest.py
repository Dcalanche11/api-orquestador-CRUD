from copy import deepcopy

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from employee_api.domain.entities import Role
from employee_api.infrastructure.config import Settings
from employee_api.infrastructure.database import Base
from employee_api.infrastructure.models import UserModel
from employee_api.infrastructure.security import password_hasher
from employee_api.main import create_app

TEST_PASSWORD = "test-password-only-123"


@pytest.fixture(scope="session")
def hashed_password():
    return password_hasher.hash(TEST_PASSWORD)


@pytest.fixture
def factory(hashed_password):
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )

    @event.listens_for(engine, "connect")
    def foreign_keys(connection, record):
        connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    factory = sessionmaker(engine, expire_on_commit=False)
    with factory.begin() as session:
        session.add_all(
            [
                UserModel(username="admin", password_hash=hashed_password, role=Role.HR_ADMIN),
                UserModel(
                    username="viewer", password_hash=hashed_password, role=Role.EMPLOYEE_VIEWER
                ),
                UserModel(
                    username="inactive",
                    password_hash=hashed_password,
                    role=Role.HR_ADMIN,
                    is_active=False,
                ),
            ]
        )
    yield factory
    engine.dispose()


@pytest.fixture
def settings():
    return Settings(
        _env_file=None,
        database_url="sqlite://",
        jwt_secret="test-only-" * 8,
        request_rate_limit="10000/minute",
        login_rate_limit="10000/minute",
        rate_limit_storage_uri="memory://",
    )


@pytest.fixture
def app(factory, settings):
    return create_app(settings, factory)


@pytest.fixture
def client(app):
    with TestClient(app) as client:
        yield client


def login(client, username="admin"):
    response = client.post(
        "/api/v1/auth/token", data={"username": username, "password": TEST_PASSWORD}
    )
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.fixture
def admin(client):
    return login(client)


@pytest.fixture
def viewer(client):
    return login(client, "viewer")


@pytest.fixture
def payload():
    return deepcopy(
        {
            "first_names": "Ana María",
            "last_names": "López Pérez",
            "gender": "FEMALE",
            "marital_status": "SINGLE",
            "birth_date": "1995-05-20",
            "dpi": "1234567890101",
            "nit": "1234567-8",
            "igss_number": "IGSS123",
            "irtra_number": None,
            "addresses": [
                {
                    "line1": "10 calle 2-30, zona 1",
                    "municipality": "Guatemala",
                    "department": "Guatemala",
                }
            ],
            "salary": {"base_amount": "6500.00", "bonus_amount": "250.00"},
        }
    )
