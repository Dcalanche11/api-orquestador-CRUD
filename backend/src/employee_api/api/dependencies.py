from typing import Annotated

from fastapi import Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer

from employee_api.application.employees import EmployeeService
from employee_api.domain.entities import Role, User
from employee_api.infrastructure.repositories import SQLAlchemyUnitOfWork, SQLAlchemyUserRepository
from employee_api.infrastructure.security import AuthService

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")


def auth_service(request: Request):
    with request.app.state.session_factory() as session:
        yield AuthService(SQLAlchemyUserRepository(session), request.app.state.settings)


Auth = Annotated[AuthService, Depends(auth_service)]


def current_user(token: Annotated[str, Depends(oauth2_scheme)], auth: Auth) -> User:
    return auth.authenticate(token)


CurrentUser = Annotated[User, Depends(current_user)]


def admin_user(user: CurrentUser) -> User:
    if user.role != Role.HR_ADMIN:
        raise HTTPException(status_code=403, detail="Se requiere el rol HR_ADMIN.")
    return user


AdminUser = Annotated[User, Depends(admin_user)]


def employee_service(request: Request) -> EmployeeService:
    return EmployeeService(SQLAlchemyUnitOfWork(request.app.state.session_factory))


Employees = Annotated[EmployeeService, Depends(employee_service)]
