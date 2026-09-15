from datetime import date, datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from employee_api.infrastructure.database import Base


class EmployeeModel(Base):
    __tablename__ = "employees"
    __table_args__ = (
        CheckConstraint("gender IN ('FEMALE','MALE','OTHER','UNSPECIFIED')", name="ck_gender"),
        CheckConstraint(
            "marital_status IN ('SINGLE','MARRIED','DIVORCED','WIDOWED','CIVIL_UNION')",
            name="ck_marital_status",
        ),
    )
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    first_names: Mapped[str] = mapped_column(String(100), index=True)
    last_names: Mapped[str] = mapped_column(String(100), index=True)
    gender: Mapped[str] = mapped_column(String(20))
    marital_status: Mapped[str] = mapped_column(String(20))
    birth_date: Mapped[date] = mapped_column(Date)
    dpi: Mapped[str] = mapped_column(String(13), unique=True)
    nit: Mapped[str] = mapped_column(String(20), unique=True)
    igss_number: Mapped[str | None] = mapped_column(String(30))
    irtra_number: Mapped[str | None] = mapped_column(String(30))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    addresses: Mapped[list["AddressModel"]] = relationship(
        cascade="all, delete-orphan", order_by="AddressModel.position"
    )
    salary: Mapped["SalaryModel"] = relationship(cascade="all, delete-orphan", uselist=False)


class AddressModel(Base):
    __tablename__ = "addresses"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    employee_id: Mapped[UUID] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), index=True
    )
    position: Mapped[int]
    line1: Mapped[str] = mapped_column(String(250))
    line2: Mapped[str | None] = mapped_column(String(250))
    municipality: Mapped[str] = mapped_column(String(100))
    department: Mapped[str] = mapped_column(String(100))
    country: Mapped[str] = mapped_column(String(2))
    postal_code: Mapped[str | None] = mapped_column(String(12))


class SalaryModel(Base):
    __tablename__ = "salary_information"
    __table_args__ = (
        CheckConstraint("base_amount >= 0 AND bonus_amount >= 0", name="ck_salary_nonnegative"),
        CheckConstraint(
            "pay_frequency IN ('MONTHLY','BIWEEKLY','WEEKLY')", name="ck_pay_frequency"
        ),
    )
    employee_id: Mapped[UUID] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), primary_key=True
    )
    base_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    bonus_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    currency: Mapped[str] = mapped_column(String(3))
    pay_frequency: Mapped[str] = mapped_column(String(20))


class UserModel(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role IN ('HR_ADMIN','EMPLOYEE_VIEWER')", name="ck_user_role"),
    )
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    username: Mapped[str] = mapped_column(String(100), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(30))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class AuditModel(Base):
    __tablename__ = "audit_logs"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    actor_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    # Sin FK a employees: la auditoría sobrevive al borrado del empleado.
    employee_id: Mapped[UUID] = mapped_column(Uuid, index=True)
    action: Mapped[str] = mapped_column(String(10))
    changed_fields: Mapped[list[str]] = mapped_column(JSON)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
