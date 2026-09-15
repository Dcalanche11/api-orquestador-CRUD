from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, Response
from fastapi.security import OAuth2PasswordRequestForm

from employee_api.api.dependencies import AdminUser, Auth, CurrentUser, Employees
from employee_api.api.schemas import (
    EmployeePage,
    EmployeeRead,
    EmployeeSummaryRead,
    EmployeeWrite,
    SalaryPatch,
    TokenResponse,
    UserRead,
)


def build_router(limiter, settings):
    router = APIRouter(prefix="/api/v1")

    @router.post("/auth/token", response_model=TokenResponse, tags=["Autenticación"])
    @limiter.limit(settings.login_rate_limit)
    def login(
        request: Request,
        response: Response,
        auth: Auth,
        form: Annotated[OAuth2PasswordRequestForm, Depends()],
    ):
        response.headers["Cache-Control"] = "no-store"
        return TokenResponse(access_token=auth.login(form.username, form.password))

    @router.get("/auth/me", response_model=UserRead, tags=["Autenticación"])
    def me(user: CurrentUser):
        return UserRead.model_validate(user)

    @router.get("/employees", response_model=EmployeePage, tags=["Empleados"])
    def list_employees(
        user: CurrentUser,
        service: Employees,
        offset: Annotated[int, Query(ge=0)] = 0,
        limit: Annotated[int, Query(ge=1, le=100)] = 20,
        name: Annotated[str | None, Query(min_length=1, max_length=100)] = None,
        dpi: Annotated[str | None, Query(pattern=r"^[0-9]{13}$")] = None,
    ):
        items, total = service.list(offset, limit, name, dpi)
        return EmployeePage(
            items=[EmployeeRead.model_validate(item) for item in items],
            total=total,
            offset=offset,
            limit=limit,
        )

    @router.post("/employees", response_model=EmployeeRead, status_code=201, tags=["Empleados"])
    def create_employee(
        payload: EmployeeWrite, response: Response, user: AdminUser, service: Employees
    ):
        employee = service.create(payload.to_entity(), user.id)
        response.headers["Location"] = f"/api/v1/employees/{employee.id}"
        return EmployeeRead.model_validate(employee)

    @router.get("/employees/summary", response_model=EmployeeSummaryRead, tags=["Empleados"])
    def employee_summary(user: CurrentUser, service: Employees):
        return EmployeeSummaryRead.model_validate(service.summary())

    @router.get("/employees/{employee_id}", response_model=EmployeeRead, tags=["Empleados"])
    def get_employee(employee_id: UUID, user: CurrentUser, service: Employees):
        return EmployeeRead.model_validate(service.get(employee_id))

    @router.put("/employees/{employee_id}", response_model=EmployeeRead, tags=["Empleados"])
    def replace_employee(
        employee_id: UUID, payload: EmployeeWrite, user: AdminUser, service: Employees
    ):
        return EmployeeRead.model_validate(
            service.replace(employee_id, payload.to_entity(), user.id)
        )

    @router.patch(
        "/employees/{employee_id}/salary", response_model=EmployeeRead, tags=["Empleados"]
    )
    def update_salary(employee_id: UUID, payload: SalaryPatch, user: AdminUser, service: Employees):
        return EmployeeRead.model_validate(
            service.update_salary(employee_id, payload.model_dump(exclude_unset=True), user.id)
        )

    @router.delete("/employees/{employee_id}", status_code=204, tags=["Empleados"])
    def delete_employee(employee_id: UUID, user: AdminUser, service: Employees):
        service.delete(employee_id, user.id)
        return Response(status_code=204)

    return router
