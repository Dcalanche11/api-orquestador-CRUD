from dataclasses import asdict
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from employee_api.domain.entities import (
    Address,
    Employee,
    EmployeeSummary,
    Gender,
    GenderCount,
    MaritalStatus,
    PayFrequency,
    Role,
    Salary,
    SalarySummary,
    User,
)
from employee_api.domain.errors import ConflictError
from employee_api.infrastructure.models import (
    AddressModel,
    AuditModel,
    EmployeeModel,
    SalaryModel,
    UserModel,
)


def to_entity(model: EmployeeModel) -> Employee:
    return Employee(
        id=model.id,
        first_names=model.first_names,
        last_names=model.last_names,
        gender=Gender(model.gender),
        marital_status=MaritalStatus(model.marital_status),
        birth_date=model.birth_date,
        dpi=model.dpi,
        nit=model.nit,
        igss_number=model.igss_number,
        irtra_number=model.irtra_number,
        created_at=model.created_at,
        updated_at=model.updated_at,
        addresses=[
            Address(
                line1=a.line1,
                line2=a.line2,
                municipality=a.municipality,
                department=a.department,
                country=a.country,
                postal_code=a.postal_code,
            )
            for a in model.addresses
        ],
        salary=Salary(
            base_amount=model.salary.base_amount,
            bonus_amount=model.salary.bonus_amount,
            currency=model.salary.currency,
            pay_frequency=PayFrequency(model.salary.pay_frequency),
        ),
    )


class SQLAlchemyEmployeeRepository:
    def __init__(self, session: Session):
        self.session = session

    def summary(self) -> EmployeeSummary:
        total, igss, irtra = self.session.execute(
            select(
                func.count(EmployeeModel.id),
                func.count(EmployeeModel.igss_number),
                func.count(EmployeeModel.irtra_number),
            )
        ).one()
        addresses = self.session.scalar(select(func.count()).select_from(AddressModel))
        genders = self.session.execute(
            select(EmployeeModel.gender, func.count())
            .group_by(EmployeeModel.gender)
            .order_by(EmployeeModel.gender)
        )
        salaries = self.session.execute(
            select(
                SalaryModel.currency,
                SalaryModel.pay_frequency,
                func.count(),
                func.sum(SalaryModel.base_amount),
                func.sum(SalaryModel.bonus_amount),
            )
            .group_by(SalaryModel.currency, SalaryModel.pay_frequency)
            .order_by(SalaryModel.currency, SalaryModel.pay_frequency)
        )
        return EmployeeSummary(
            total=total,
            igss_count=igss,
            irtra_count=irtra,
            address_count=addresses,
            genders=[GenderCount(Gender(gender), count) for gender, count in genders],
            salaries=[
                SalarySummary(currency, PayFrequency(frequency), count, base, bonus)
                for currency, frequency, count, base, bonus in salaries
            ],
        )

    def get(self, employee_id: UUID, *, for_update: bool = False) -> Employee | None:
        statement = (
            select(EmployeeModel)
            .where(EmployeeModel.id == employee_id)
            .options(selectinload(EmployeeModel.addresses), selectinload(EmployeeModel.salary))
        )
        if for_update:
            statement = statement.with_for_update()
        model = self.session.scalar(statement)
        return to_entity(model) if model else None

    def list(self, offset: int, limit: int, name: str | None, dpi: str | None):
        filters = []
        if name:
            filters.append(
                (EmployeeModel.first_names + " " + EmployeeModel.last_names).icontains(
                    name, autoescape=True
                )
            )
        if dpi:
            filters.append(EmployeeModel.dpi == dpi)
        count = self.session.scalar(select(func.count()).select_from(EmployeeModel).where(*filters))
        statement = (
            select(EmployeeModel)
            .where(*filters)
            .options(selectinload(EmployeeModel.addresses), selectinload(EmployeeModel.salary))
            .order_by(EmployeeModel.last_names, EmployeeModel.first_names, EmployeeModel.id)
        )
        records = self.session.scalars(statement.offset(offset).limit(limit))
        return [to_entity(record) for record in records], count

    def save(self, employee: Employee) -> Employee:
        model = self.session.get(EmployeeModel, employee.id)
        if model is None:
            model = EmployeeModel(id=employee.id)
            self.session.add(model)
        for key in (
            "first_names",
            "last_names",
            "gender",
            "marital_status",
            "birth_date",
            "dpi",
            "nit",
            "igss_number",
            "irtra_number",
        ):
            setattr(model, key, getattr(employee, key))
        # Cargar relaciones antes de mutar evita autoflush de un agregado incompleto.
        with self.session.no_autoflush:
            model.addresses = [
                AddressModel(position=i, **asdict(address))
                for i, address in enumerate(employee.addresses)
            ]
            if model.salary is None:
                model.salary = SalaryModel(**asdict(employee.salary))
            else:
                for key, value in asdict(employee.salary).items():
                    setattr(model.salary, key, value)
        model.updated_at = datetime.now(UTC)
        self.session.flush()
        return to_entity(model)

    def delete(self, employee_id: UUID) -> None:
        model = self.session.get(EmployeeModel, employee_id)
        self.session.delete(model)
        self.session.flush()


class SQLAlchemyAuditRepository:
    def __init__(self, session: Session):
        self.session = session

    def record(
        self, actor_id: UUID, employee_id: UUID, action: str, changed_fields: list[str]
    ) -> None:
        self.session.add(
            AuditModel(
                actor_id=actor_id,
                employee_id=employee_id,
                action=action,
                changed_fields=changed_fields,
            )
        )


class SQLAlchemyUnitOfWork:
    def __init__(self, session_factory):
        self.session_factory = session_factory

    def __enter__(self):
        self.session = self.session_factory()
        self.employees = SQLAlchemyEmployeeRepository(self.session)
        self.audit = SQLAlchemyAuditRepository(self.session)
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.session.rollback()
        self.session.close()
        if isinstance(exc_value, IntegrityError):
            # Solamente colisiones de DPI/NIT se convierten en 409; otras son errores internos.
            original = exc_value.orig
            constraint = getattr(getattr(original, "diag", None), "constraint_name", "")
            duplicate = constraint in {"employees_dpi_key", "employees_nit_key"}
            sqlite_duplicate = any(
                f"UNIQUE constraint failed: employees.{key}" in str(original)
                for key in ("dpi", "nit")
            )
            if duplicate or sqlite_duplicate:
                raise ConflictError("Ya existe un empleado con ese DPI o NIT.") from None

    def commit(self):
        self.session.commit()


class SQLAlchemyUserRepository:
    def __init__(self, session: Session):
        self.session = session

    @staticmethod
    def _entity(model: UserModel | None) -> User | None:
        if model is None:
            return None
        return User(
            id=model.id,
            username=model.username,
            password_hash=model.password_hash,
            role=Role(model.role),
            is_active=model.is_active,
        )

    def by_username(self, username: str) -> User | None:
        return self._entity(
            self.session.scalar(select(UserModel).where(UserModel.username == username))
        )

    def by_id(self, user_id: UUID) -> User | None:
        return self._entity(self.session.get(UserModel, user_id))
