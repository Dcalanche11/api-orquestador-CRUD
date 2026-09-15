import argparse
import getpass
import re

from sqlalchemy.exc import IntegrityError

from employee_api.domain.entities import Role
from employee_api.infrastructure.config import get_settings
from employee_api.infrastructure.database import build_session_factory
from employee_api.infrastructure.models import UserModel
from employee_api.infrastructure.security import password_hasher


def main():
    parser = argparse.ArgumentParser(
        description="Crear usuarios locales; no existe registro público."
    )
    parser.add_argument("username")
    parser.add_argument("--role", choices=list(Role), default=Role.HR_ADMIN)
    args = parser.parse_args()
    if not re.fullmatch(r"[A-Za-z0-9_.@-]{3,100}", args.username):
        parser.error("El usuario debe tener entre 3 y 100 caracteres válidos.")
    password = getpass.getpass("Contraseña (mínimo 12 caracteres): ")
    if len(password) < 12:
        parser.error("La contraseña debe contener al menos 12 caracteres.")
    if password != getpass.getpass("Confirmar contraseña: "):
        parser.error("Las contraseñas no coinciden.")
    factory = build_session_factory(get_settings().database_url.get_secret_value())
    try:
        with factory.begin() as session:
            session.add(
                UserModel(
                    username=args.username,
                    role=args.role,
                    password_hash=password_hasher.hash(password),
                )
            )
    except IntegrityError:
        parser.exit(1, "No se pudo crear el usuario; compruebe si ya existe.\n")
    finally:
        factory.kw["bind"].dispose()
    print(f"Usuario {args.username} creado con rol {args.role}.")
