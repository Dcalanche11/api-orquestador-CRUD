from datetime import date

import pytest
from pydantic import ValidationError

from employee_api.domain.entities import calculate_age
from employee_api.infrastructure.config import Settings


@pytest.mark.parametrize(
    "birth,reference,expected",
    [
        (date(2000, 5, 20), date(2026, 5, 19), 25),
        (date(2000, 5, 20), date(2026, 5, 20), 26),
        (date(2000, 2, 29), date(2025, 2, 28), 24),
        (date(2000, 2, 29), date(2025, 3, 1), 25),
    ],
)
def test_age(birth, reference, expected):
    assert calculate_age(birth, reference) == expected


def test_future_birth():
    with pytest.raises(ValueError):
        calculate_age(date(2999, 1, 1))


@pytest.mark.parametrize("overrides", [{"jwt_secret": "short"}, {"cors_origins": ["*"]}])
def test_configuration_rejects_unsafe_values(overrides):
    with pytest.raises(ValidationError):
        Settings(
            _env_file=None, **({"database_url": "sqlite://", "jwt_secret": "x" * 64} | overrides)
        )
