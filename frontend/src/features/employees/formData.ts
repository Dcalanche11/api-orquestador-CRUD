import type { Address, Employee, EmployeeWrite } from "../../types/models";

export const newAddress = (): Address => ({
  line1: "",
  line2: null,
  municipality: "",
  department: "",
  country: "GT",
  postal_code: null,
});
export const emptyEmployee = (): EmployeeWrite => ({
  first_names: "",
  last_names: "",
  gender: "UNSPECIFIED",
  marital_status: "SINGLE",
  birth_date: "",
  dpi: "",
  nit: "",
  igss_number: null,
  irtra_number: null,
  addresses: [newAddress()],
  salary: {
    base_amount: "",
    bonus_amount: "0.00",
    currency: "GTQ",
    pay_frequency: "MONTHLY",
  },
});
export function editableEmployee(employee: Employee): EmployeeWrite {
  return {
    first_names: employee.first_names,
    last_names: employee.last_names,
    gender: employee.gender,
    marital_status: employee.marital_status,
    birth_date: employee.birth_date,
    dpi: employee.dpi,
    nit: employee.nit,
    igss_number: employee.igss_number,
    irtra_number: employee.irtra_number,
    addresses: employee.addresses.map((address) => ({ ...address })),
    salary: { ...employee.salary },
  };
}
export function writePayload(value: EmployeeWrite): EmployeeWrite {
  return {
    ...value,
    igss_number: value.igss_number?.trim() || null,
    irtra_number: value.irtra_number?.trim() || null,
    addresses: value.addresses.map((address) => ({
      ...address,
      line2: address.line2?.trim() || null,
      postal_code: address.postal_code?.trim() || null,
    })),
  };
}
