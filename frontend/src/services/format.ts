import type { Employee, Salary } from "../types/models";

export const genders = {
  FEMALE: "Femenino",
  MALE: "Masculino",
  OTHER: "Otro",
  UNSPECIFIED: "Sin especificar",
};
export const maritalStatuses = {
  SINGLE: "Soltero/a",
  MARRIED: "Casado/a",
  DIVORCED: "Divorciado/a",
  WIDOWED: "Viudo/a",
  CIVIL_UNION: "Unión de hecho",
};
export const frequencies = {
  MONTHLY: "Mensual",
  BIWEEKLY: "Quincenal",
  WEEKLY: "Semanal",
};
export const initials = (
  employee: Pick<Employee, "first_names" | "last_names">,
) =>
  `${employee.first_names[0] || ""}${employee.last_names[0] || ""}`.toUpperCase();
export function money(value: string | number, currency: string) {
  // Solo presentación. El cálculo y la persistencia de importes pertenecen al backend.
  return new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency,
    currencyDisplay: "code",
  }).format(Number(value));
}
export const salaryLabel = (salary: Salary) =>
  frequencies[salary.pay_frequency || "MONTHLY"];
export const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("es-GT", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value));
