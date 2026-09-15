"""Exporta el contrato sin conectarse a la base de datos."""

import json
from pathlib import Path

from employee_api.infrastructure.config import Settings
from employee_api.main import create_app

root = Path(__file__).resolve().parents[1]
settings = Settings(
    _env_file=None,
    database_url="postgresql+psycopg://schema:schema@localhost/schema",
    jwt_secret="schema-export-only-" * 3,
    rate_limit_storage_uri="memory://",
)
app = create_app(settings)
(root / "docs" / "openapi.json").write_text(
    json.dumps(app.openapi(), ensure_ascii=False, indent=2) + "\n"
)
print("Contrato exportado a docs/openapi.json")
