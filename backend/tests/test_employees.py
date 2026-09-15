from copy import deepcopy
from uuid import uuid4

import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import OperationalError

from employee_api.infrastructure.models import AddressModel, AuditModel, EmployeeModel, SalaryModel
from employee_api.infrastructure.repositories import SQLAlchemyAuditRepository

URL = "/api/v1/employees"


def test_crud_and_audit(client, admin, viewer, payload, factory):
    response = client.post(URL, json=payload, headers=admin)
    assert response.status_code == 201, response.text
    employee = response.json()
    employee_url = f"{URL}/{employee['id']}"
    assert response.headers["location"] == employee_url
    assert employee["nit"] == "12345678"
    assert isinstance(employee["age"], int)
    assert employee["salary"]["base_amount"] == "6500.00"
    assert "password_hash" not in response.text
    assert client.get(employee_url, headers=viewer).status_code == 200
    page = client.get(URL, params={"name": "ana", "dpi": payload["dpi"]}, headers=viewer).json()
    assert page["total"] == 1 and len(page["items"]) == 1
    assert client.get(URL, params={"name": "%"}, headers=viewer).json()["total"] == 0
    assert client.get(URL, params={"offset": 1}, headers=viewer).json()["items"] == []

    replacement = deepcopy(payload)
    replacement["first_names"] = "Ana Lucía"
    replacement["igss_number"] = None
    replacement["addresses"] *= 2
    updated = client.put(employee_url, json=replacement, headers=admin)
    assert updated.status_code == 200, updated.text
    assert updated.json()["id"] == employee["id"]
    assert updated.json()["created_at"] == employee["created_at"]
    assert updated.json()["igss_number"] is None
    assert len(updated.json()["addresses"]) == 2
    salary = client.patch(f"{employee_url}/salary", json={"base_amount": "7000.25"}, headers=admin)
    assert salary.status_code == 200, salary.text
    assert salary.json()["salary"]["bonus_amount"] == "250.00"
    assert salary.json()["salary"]["base_amount"] == "7000.25"
    assert client.delete(employee_url, headers=admin).status_code == 204
    assert client.get(employee_url, headers=admin).status_code == 404
    with factory() as session:
        assert session.scalar(select(func.count()).select_from(EmployeeModel)) == 0
        assert session.scalar(select(func.count()).select_from(AddressModel)) == 0
        assert session.scalar(select(func.count()).select_from(SalaryModel)) == 0
        logs = session.scalars(
            select(AuditModel).order_by(AuditModel.occurred_at, AuditModel.id)
        ).all()
        assert len(logs) == 4
        assert {log.action for log in logs} == {"CREATE", "UPDATE", "DELETE"}
        assert any(log.changed_fields == ["salary.base_amount"] for log in logs)
        assert all(log.actor_id and log.occurred_at for log in logs)


@pytest.mark.parametrize("field", ["dpi", "nit"])
def test_duplicate_rolls_back(client, admin, payload, factory, field):
    assert client.post(URL, json=payload, headers=admin).status_code == 201
    duplicate = deepcopy(payload)
    duplicate["dpi"] = "9876543210101"
    duplicate["nit"] = "9876543-2"
    duplicate[field] = payload[field]
    response = client.post(URL, json=duplicate, headers=admin)
    assert response.status_code == 409, response.text
    assert "INSERT" not in response.text
    with factory() as session:
        for model in (EmployeeModel, AddressModel, SalaryModel, AuditModel):
            assert session.scalar(select(func.count()).select_from(model)) == 1


@pytest.mark.parametrize(
    "method,path,data",
    [
        ("post", "", {}),
        ("put", "/{id}", {}),
        ("patch", "/{id}/salary", {"base_amount": "1"}),
        ("delete", "/{id}", None),
    ],
)
def test_viewer_cannot_mutate(client, viewer, payload, method, path, data):
    kwargs = {"headers": viewer}
    if data is not None:
        kwargs["json"] = payload if method in {"post", "put"} else data
    response = getattr(client, method)(URL + path.format(id=uuid4()), **kwargs)
    assert response.status_code == 403


@pytest.mark.parametrize(
    "patch",
    [
        {"dpi": "abc"},
        {"nit": "CF"},
        {"birth_date": "2999-01-01"},
        {"first_names": "   "},
        {"gender": "invalid"},
        {"addresses": []},
        {"salary": {"base_amount": "-1"}},
        {"salary": {"base_amount": "1.001"}},
        {"salary": {"base_amount": "NaN"}},
        {"salary": {"base_amount": "1000000000000"}},
        {"age": 31},
        {"unexpected": "field"},
    ],
)
def test_invalid_payload(client, admin, payload, patch):
    response = client.post(URL, json=payload | patch, headers=admin)
    assert response.status_code == 422
    assert all("input" not in error and "ctx" not in error for error in response.json()["detail"])


@pytest.mark.parametrize(
    "patch", [{}, {"base_amount": None}, {"currency": "bad"}, {"base_amount": "-1"}, {"unknown": 1}]
)
def test_invalid_salary_patch(client, admin, patch):
    assert client.patch(f"{URL}/{uuid4()}/salary", json=patch, headers=admin).status_code == 422


@pytest.mark.parametrize("query", ["limit=0", "limit=101", "offset=-1", "dpi=bad"])
def test_invalid_pagination(client, admin, query):
    assert client.get(f"{URL}?{query}", headers=admin).status_code == 422


def test_missing_records(client, admin, payload):
    url = f"{URL}/{uuid4()}"
    assert client.put(url, json=payload, headers=admin).status_code == 404
    assert client.delete(url, headers=admin).status_code == 404
    assert (
        client.patch(f"{url}/salary", json={"base_amount": "1"}, headers=admin).status_code == 404
    )
    assert client.get(f"{URL}/invalid", headers=admin).status_code == 422


def test_audit_failure_rolls_back_entire_create(client, admin, payload, factory, monkeypatch):
    def fail(*args, **kwargs):
        raise OperationalError("secret sql", {}, RuntimeError("secret password"))

    monkeypatch.setattr(SQLAlchemyAuditRepository, "record", fail)
    response = client.post(URL, json=payload, headers=admin)
    assert response.status_code == 503
    assert "secret" not in response.text
    with factory() as session:
        for model in (EmployeeModel, AddressModel, SalaryModel, AuditModel):
            assert session.scalar(select(func.count()).select_from(model)) == 0
