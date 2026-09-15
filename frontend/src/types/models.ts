import type { components } from "./api.generated";

export type Employee = components["schemas"]["EmployeeRead"];
export type EmployeeWrite = components["schemas"]["EmployeeWrite"];
export type EmployeePage = components["schemas"]["EmployeePage"];
export type User = components["schemas"]["UserRead"];
export type SalaryPatch = components["schemas"]["SalaryPatch"];
export type Salary = Employee["salary"];
export type Address = EmployeeWrite["addresses"][number];

export type EmployeeSummary = components["schemas"]["EmployeeSummaryRead"];
