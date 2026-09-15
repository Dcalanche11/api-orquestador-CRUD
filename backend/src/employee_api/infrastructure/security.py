from datetime import UTC, datetime, timedelta
from uuid import UUID

import jwt
from pwdlib import PasswordHash

from employee_api.domain.entities import User
from employee_api.domain.errors import AuthenticationError
from employee_api.domain.ports import UserRepository
from employee_api.infrastructure.config import Settings

password_hasher = PasswordHash.recommended()
dummy_hash = password_hasher.hash("dummy-password-for-timing-equalization")


class AuthService:
    def __init__(self, users: UserRepository, settings: Settings):
        self.users = users
        self.settings = settings

    def login(self, username: str, password: str) -> str:
        user = self.users.by_username(username)
        valid = password_hasher.verify(password, user.password_hash if user else dummy_hash)
        if not user or not valid or not user.is_active:
            raise AuthenticationError("Credenciales inválidas.")
        now = datetime.now(UTC)
        return jwt.encode(
            {
                "sub": str(user.id),
                "iat": now,
                "exp": now + timedelta(minutes=self.settings.access_token_minutes),
                "iss": self.settings.jwt_issuer,
                "aud": self.settings.jwt_audience,
            },
            self.settings.jwt_secret.get_secret_value(),
            algorithm="HS256",
        )

    def authenticate(self, token: str) -> User:
        try:
            claims = jwt.decode(
                token,
                self.settings.jwt_secret.get_secret_value(),
                algorithms=["HS256"],
                issuer=self.settings.jwt_issuer,
                audience=self.settings.jwt_audience,
                options={"require": ["sub", "exp", "iat", "iss", "aud"]},
            )
            user = self.users.by_id(UUID(claims["sub"]))
        except (jwt.InvalidTokenError, ValueError, TypeError, AttributeError):
            raise AuthenticationError("Token inválido o expirado.") from None
        if not user or not user.is_active:
            raise AuthenticationError("Usuario inactivo o no encontrado.")
        return user
