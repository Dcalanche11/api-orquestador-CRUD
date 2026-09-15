from dataclasses import asdict
from uuid import UUID

from employee_api.domain.entities import Employee, Salary
from employee_api.domain.errors import NotFoundError
from employee_api.domain.ports import UnitOfWork


def business_fields(employee: Employee) -> dict:
    return {
        key: value
        for key, value in asdict(employee).items()
        if key not in {"id", "created_at", "updated_at"}
    }


def changed_fields(before: dict, after: dict, prefix: str = "") -> list[str]:
    changes = []
    for key, value in after.items():
        path = f"{prefix}{key}"
        if isinstance(value, dict):
            changes.extend(changed_fields(before.get(key, {}), value, f"{path}."))
        elif before.get(key) != value:
            changes.append(path)
    return sorted(changes)


class EmployeeService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    def summary(self):
        with self.uow:
            return self.uow.employees.summary()

    def list(self, offset: int, limit: int, name: str | None, dpi: str | None):
        with self.uow:
            return self.uow.employees.list(offset, limit, name, dpi)

    def _get(self, employee_id: UUID, *, for_update: bool = False) -> Employee:
        employee = self.uow.employees.get(employee_id, for_update=for_update)
        if employee is None:
            raise NotFoundError("Empleado no encontrado.")
        return employee

    def get(self, employee_id: UUID) -> Employee:
        with self.uow:
            return self._get(employee_id)

    def create(self, employee: Employee, actor_id: UUID) -> Employee:
        with self.uow:
            saved = self.uow.employees.save(employee)
            self.uow.audit.record(actor_id, saved.id, "CREATE", sorted(business_fields(saved)))
            self.uow.commit()
            return saved

    def replace(self, employee_id: UUID, replacement: Employee, actor_id: UUID) -> Employee:
        with self.uow:
            current = self._get(employee_id, for_update=True)
            replacement.id = employee_id
            changes = changed_fields(business_fields(current), business_fields(replacement))
            saved = self.uow.employees.save(replacement)
            self.uow.audit.record(actor_id, employee_id, "UPDATE", changes)
            self.uow.commit()
            return saved

    def update_salary(self, employee_id: UUID, updates: dict, actor_id: UUID) -> Employee:
        with self.uow:
            employee = self._get(employee_id, for_update=True)
            before = business_fields(employee)
            employee.salary = Salary(**(asdict(employee.salary) | updates))
            saved = self.uow.employees.save(employee)
            changes = changed_fields(before, business_fields(saved))
            self.uow.audit.record(actor_id, employee_id, "UPDATE", changes)
            self.uow.commit()
            return saved

    def delete(self, employee_id: UUID, actor_id: UUID) -> None:
        with self.uow:
            employee = self._get(employee_id, for_update=True)
            self.uow.employees.delete(employee_id)
            self.uow.audit.record(
                actor_id, employee_id, "DELETE", sorted(business_fields(employee))
            )
            self.uow.commit()
