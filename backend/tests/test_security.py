from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from employee_api.infrastructure.models import UserModel
from employee_api.main import create_app


def test_requires_token(client):
    assert client.get("/api/v1/employees").status_code == 401
    assert client.get("/api/v1/auth/me").status_code == 401


def test_current_user_has_role_without_sensitive_fields(client, admin, viewer):
    profile = client.get("/api/v1/auth/me", headers=admin)
    assert profile.status_code == 200
    assert set(profile.json()) == {"id", "username", "role"}
    assert profile.json()["role"] == "HR_ADMIN"
    assert client.get("/api/v1/auth/me", headers=viewer).json()["role"] == "EMPLOYEE_VIEWER"


@pytest.mark.parametrize(
    "username,password",
    [("unknown", "bad"), ("admin", "bad"), ("inactive", "test-password-only-123")],
)
def test_invalid_login(client, username, password):
    response = client.post("/api/v1/auth/token", data={"username": username, "password": password})
    assert response.status_code == 401
    assert response.json()["detail"] == "Credenciales inválidas."


@pytest.mark.parametrize(
    "variant",
    [
        "expired",
        "unknown",
        "bad_sub",
        "issuer",
        "audience",
        "missing_exp",
        "wrong_key",
        "malformed",
    ],
)
def test_invalid_tokens(client, settings, variant):
    now = datetime.now(UTC)
    claims = {
        "sub": str(uuid4()),
        "iat": now,
        "exp": now + timedelta(minutes=5),
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
    }
    key = settings.jwt_secret.get_secret_value()
    if variant == "expired":
        claims["exp"] = now - timedelta(minutes=5)
    elif variant == "bad_sub":
        claims["sub"] = "not-a-uuid"
    elif variant == "issuer":
        claims["iss"] = "wrong"
    elif variant == "audience":
        claims["aud"] = "wrong"
    elif variant == "missing_exp":
        del claims["exp"]
    elif variant == "wrong_key":
        key = "wrong-signing-key" * 4
    token = "invalid" if variant == "malformed" else jwt.encode(claims, key, algorithm="HS256")
    response = client.get("/api/v1/employees", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_revoked_user_and_role_apply_immediately(client, admin, payload, factory):
    with factory.begin() as session:
        user = session.scalar(select(UserModel).where(UserModel.username == "admin"))
        user.role = "EMPLOYEE_VIEWER"
    assert client.post("/api/v1/employees", json=payload, headers=admin).status_code == 403
    with factory.begin() as session:
        user = session.scalar(select(UserModel).where(UserModel.username == "admin"))
        user.is_active = False
    assert client.get("/api/v1/employees", headers=admin).status_code == 401


def test_login_rate_limit(factory, settings):
    settings.login_rate_limit = "2/minute"
    with TestClient(create_app(settings, factory)) as client:
        for _ in range(2):
            assert (
                client.post(
                    "/api/v1/auth/token", data={"username": "bad", "password": "bad"}
                ).status_code
                == 401
            )
        assert (
            client.post(
                "/api/v1/auth/token", data={"username": "bad", "password": "bad"}
            ).status_code
            == 429
        )


def test_default_rate_limit(factory, settings):
    settings.request_rate_limit = "2/minute"
    with TestClient(create_app(settings, factory)) as client:
        assert client.get("/health/live").status_code == 200
        assert client.get("/health/live").status_code == 200
        assert client.get("/health/live").status_code == 429


def test_cors_health_and_openapi(client):
    assert client.get("/health/live").json() == {"status": "ok"}
    assert client.get("/health/ready").status_code == 200
    schema = client.get("/openapi.json").json()
    assert "delete" in schema["paths"]["/api/v1/employees/{employee_id}"]
    response = client.options(
        "/api/v1/employees",
        headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"},
    )
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    forbidden = client.options(
        "/api/v1/employees",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "GET"},
    )
    assert "access-control-allow-origin" not in forbidden.headers
    assert client.get("/health/live").headers["cache-control"] == "no-store"
