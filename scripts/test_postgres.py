"""Ejecuta toda la suite con PostgreSQL local usando .env sin imprimir secretos."""

import os
import subprocess
import sys
from pathlib import Path

from dotenv import dotenv_values

root = Path(__file__).resolve().parents[1]
values = dotenv_values(root / ".env")
url = os.environ.get("TEST_DATABASE_URL") or values.get("DATABASE_URL")
if not url:
    raise SystemExit("Cree .env con scripts/init_env.py e inicie PostgreSQL.")
environment = os.environ.copy()
environment["TEST_DATABASE_URL"] = url
raise SystemExit(
    subprocess.call(
        [sys.executable, "-m", "pytest", "-q"], cwd=root / "backend", env=environment
    )
)
