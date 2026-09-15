from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo


def today() -> date:
    return datetime.now(ZoneInfo("America/Guatemala")).date()


def calculate_age(birth_date: date, on_date: date | None = None) -> int:
    reference = on_date or today()
    if birth_date > reference:
        raise ValueError("La fecha de nacimiento no puede estar en el futuro.")
    return (
        reference.year
        - birth_date.year
        - ((reference.month, reference.day) < (birth_date.month, birth_date.day))
    )


class Role(StrEnum):
    HR_ADMIN = "HR_ADMIN"
    EMPLOYEE_VIEWER = "EMPLOYEE_VIEWER"


class Gender(StrEnum):
    FEMALE = "FEMALE"
    MALE = "MALE"
    OTHER = "OTHER"
    UNSPECIFIED = "UNSPECIFIED"


class MaritalStatus(StrEnum):
    SINGLE = "SINGLE"
    MARRIED = "MARRIED"
    DIVORCED = "DIVORCED"
    WIDOWED = "WIDOWED"
    CIVIL_UNION = "CIVIL_UNION"


class PayFrequency(StrEnum):
    MONTHLY = "MONTHLY"
    BIWEEKLY = "BIWEEKLY"
    WEEKLY = "WEEKLY"


@dataclass
class Address:
    line1: str
    municipality: str
    department: str
    country: str = "GT"
    line2: str | None = None
    postal_code: str | None = None


@dataclass
class Salary:
    base_amount: Decimal
    bonus_amount: Decimal = Decimal("0.00")
    currency: str = "GTQ"
    pay_frequency: PayFrequency = PayFrequency.MONTHLY


@dataclass
class Employee:
    first_names: str
    last_names: str
    gender: Gender
    marital_status: MaritalStatus
    birth_date: date
    dpi: str
    nit: str
    addresses: list[Address]
    salary: Salary
    igss_number: str | None = None
    irtra_number: str | None = None
    id: UUID = field(default_factory=uuid4)
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @property
    def age(self) -> int:
        return calculate_age(self.birth_date)


@dataclass(frozen=True)
class User:
    id: UUID
    username: str
    password_hash: str
    role: Role
    is_active: bool = True


@dataclass(frozen=True)
class GenderCount:
    gender: Gender
    count: int


@dataclass(frozen=True)
class SalarySummary:
    currency: str
    pay_frequency: PayFrequency
    employee_count: int
    base_total: Decimal
    bonus_total: Decimal


@dataclass(frozen=True)
class EmployeeSummary:
    total: int
    igss_count: int
    irtra_count: int
    address_count: int
    genders: list[GenderCount]
    salaries: list[SalarySummary]
