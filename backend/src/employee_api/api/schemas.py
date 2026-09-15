import re
from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator, model_validator

from employee_api.domain.entities import (
    Address,
    Employee,
    Gender,
    MaritalStatus,
    PayFrequency,
    Role,
    Salary,
    calculate_age,
)

Money = Annotated[Decimal, Field(ge=0, max_digits=14, decimal_places=2, allow_inf_nan=False)]
Name = Annotated[str, Field(min_length=1, max_length=100)]
Affiliation = Annotated[str, Field(min_length=1, max_length=30, pattern=r"^[A-Za-z0-9-]+$")]


class DTO(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, from_attributes=True)


class AddressDTO(DTO):
    line1: str = Field(min_length=1, max_length=250)
    municipality: Name
    department: Name
    country: str = Field(default="GT", pattern=r"^[A-Z]{2}$")
    line2: str | None = Field(default=None, min_length=1, max_length=250)
    postal_code: str | None = Field(default=None, min_length=1, max_length=12)


class SalaryDTO(DTO):
    base_amount: Money
    bonus_amount: Money = Decimal("0.00")
    currency: str = Field(default="GTQ", pattern=r"^[A-Z]{3}$")
    pay_frequency: PayFrequency = PayFrequency.MONTHLY


class SalaryPatch(DTO):
    base_amount: Money | None = None
    bonus_amount: Money | None = None
    currency: str | None = Field(default=None, pattern=r"^[A-Z]{3}$")
    pay_frequency: PayFrequency | None = None

    @model_validator(mode="after")
    def nonempty(self) -> Self:
        if not self.model_fields_set or any(
            getattr(self, key) is None for key in self.model_fields_set
        ):
            raise ValueError("Envíe al menos un campo salarial y no utilice null.")
        return self


class EmployeeWrite(DTO):
    first_names: Name
    last_names: Name
    gender: Gender
    marital_status: MaritalStatus
    birth_date: date
    dpi: str = Field(pattern=r"^[0-9]{13}$")
    nit: str = Field(min_length=2, max_length=20, pattern=r"^[0-9]+[0-9K]$")
    igss_number: Affiliation | None = None
    irtra_number: Affiliation | None = None
    addresses: list[AddressDTO] = Field(min_length=1, max_length=10)
    salary: SalaryDTO

    @field_validator("nit", mode="before")
    @classmethod
    def normalize_nit(cls, value):
        if isinstance(value, str):
            return re.sub(r"[\s-]", "", value).upper()
        return value

    @field_validator("birth_date")
    @classmethod
    def valid_birth_date(cls, value: date) -> date:
        calculate_age(value)
        return value

    def to_entity(self) -> Employee:
        fields = self.model_dump(exclude={"addresses", "salary"})
        return Employee(
            **fields,
            addresses=[Address(**a.model_dump()) for a in self.addresses],
            salary=Salary(**self.salary.model_dump()),
        )


class EmployeeRead(EmployeeWrite):
    id: UUID
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def age(self) -> int:
        return calculate_age(self.birth_date)


class EmployeePage(DTO):
    items: list[EmployeeRead]
    total: int
    offset: int
    limit: int


class GenderCountRead(DTO):
    gender: Gender
    count: int


class SalarySummaryRead(DTO):
    currency: str
    pay_frequency: PayFrequency
    employee_count: int
    base_total: Decimal
    bonus_total: Decimal


class EmployeeSummaryRead(DTO):
    total: int
    igss_count: int
    irtra_count: int
    address_count: int
    genders: list[GenderCountRead]
    salaries: list[SalarySummaryRead]


class TokenResponse(DTO):
    access_token: str
    token_type: str = "bearer"


class UserRead(DTO):
    id: UUID
    username: str
    role: Role
