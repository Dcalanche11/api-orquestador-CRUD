"""Genera configuración local sin credenciales predeterminadas ni sobrescrituras."""

import secrets
from pathlib import Path

root = Path(__file__).resolve().parents[1]
password = secrets.token_hex(24)
template = (root / ".env.example").read_text()
content = template.replace("POSTGRES_PASSWORD=\n", f"POSTGRES_PASSWORD={password}\n")
content = content.replace("CHANGE_ME", password)
content = content.replace("JWT_SECRET=\n", f"JWT_SECRET={secrets.token_hex(32)}\n")
with (root / ".env").open("x") as output:
    output.write(content)
(root / ".env").chmod(0o600)
print("Archivo .env creado; excluido de Git.")
