from copy import deepcopy
from decimal import Decimal


def test_summary_requires_authentication(client):
    assert client.get("/api/v1/employees/summary").status_code == 401


def test_empty_summary(client, viewer):
    response = client.get("/api/v1/employees/summary", headers=viewer)
    assert response.status_code == 200
    assert response.json() == {
        "total": 0,
        "igss_count": 0,
        "irtra_count": 0,
        "address_count": 0,
        "genders": [],
        "salaries": [],
    }


def test_summary_covers_all_pages_and_separates_pay_groups(client, admin, viewer, payload):
    for index in range(12):
        record = deepcopy(payload)
        record.update(dpi=f"{index:013d}", nit=f"{index:08d}")
        record["salary"].update(base_amount="100.25", bonus_amount="10.50")
        if index == 0:
            record["salary"]["currency"] = "USD"
            record["addresses"].append(deepcopy(record["addresses"][0]))
            record["irtra_number"] = "IRTRA123"
        if index == 1:
            record["salary"]["pay_frequency"] = "WEEKLY"
            record["igss_number"] = None
            record["gender"] = "MALE"
        assert client.post("/api/v1/employees", headers=admin, json=record).status_code == 201
    assert len(client.get("/api/v1/employees?limit=10", headers=viewer).json()["items"]) == 10
    response = client.get("/api/v1/employees/summary", headers=viewer)
    assert response.status_code == 200
    data = response.json()
    assert (data["total"], data["igss_count"], data["irtra_count"], data["address_count"]) == (
        12,
        11,
        1,
        13,
    )
    assert data["genders"] == [{"gender": "FEMALE", "count": 11}, {"gender": "MALE", "count": 1}]
    groups = {(s["currency"], s["pay_frequency"]): s for s in data["salaries"]}
    assert len(groups) == 3
    monthly = groups[("GTQ", "MONTHLY")]
    assert monthly["employee_count"] == 10
    assert Decimal(monthly["base_total"]) == Decimal("1002.50")
    assert Decimal(monthly["bonus_total"]) == Decimal("105.00")
    assert groups[("USD", "MONTHLY")]["employee_count"] == 1
    assert groups[("GTQ", "WEEKLY")]["employee_count"] == 1
