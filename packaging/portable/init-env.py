"""Genera secretos nuevos; ejecutar dentro de la imagen API, nunca copiarlos a Git."""

import secrets

print(f"POSTGRES_PASSWORD={secrets.token_hex(24)}")
print(f"JWT_SECRET={secrets.token_hex(32)}")
