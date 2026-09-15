import type {
  Employee,
  EmployeePage,
  EmployeeSummary,
  EmployeeWrite,
  SalaryPatch,
  User,
} from "../types/models";

const TOKEN_KEY = "pdge.session";
const previousToken = sessionStorage.getItem("talento.session");
if (previousToken && !sessionStorage.getItem(TOKEN_KEY)) {
  sessionStorage.setItem(TOKEN_KEY, previousToken);
}
sessionStorage.removeItem("talento.session");
let currentToken = sessionStorage.getItem(TOKEN_KEY) || "";
export const session = {
  get: () => currentToken,
  set: (token: string) => {
    currentToken = token;
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  },
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

type ErrorBody = {
  detail?: string | { loc: (string | number)[]; msg: string; type: string }[];
};
const validationMessage = (type: string, fallback: string) =>
  ({
    missing: "Este campo es obligatorio.",
    string_too_short: "Completa este campo.",
    string_too_long: "El texto supera el tamaño permitido.",
    string_pattern_mismatch: "Revisa el formato de este campo.",
    greater_than_equal: "El importe no puede ser negativo.",
    decimal_max_places: "Usa un máximo de dos decimales.",
    decimal_whole_digits: "El importe es demasiado grande.",
    enum: "Selecciona una opción válida.",
  })[type] ||
  (fallback.includes("futuro")
    ? "La fecha no puede estar en el futuro."
    : "Revisa este valor.");

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (session.get()) headers.set("Authorization", `Bearer ${session.get()}`);
  if (typeof init.body === "string")
    headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;
    throw new ApiError(
      0,
      "No pudimos conectar con el servidor. Comprueba la conexión e inténtalo de nuevo.",
    );
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ErrorBody;
    const fields: Record<string, string> = {};
    if (Array.isArray(body.detail)) {
      for (const item of body.detail) {
        fields[item.loc.filter((p) => p !== "body").join(".")] =
          validationMessage(item.type, item.msg);
      }
    }
    if (response.status === 401 && path !== "/auth/token") {
      window.dispatchEvent(new Event("session-expired"));
    }
    const messages: Record<number, string> = {
      401:
        path === "/auth/token"
          ? "Usuario o contraseña incorrectos."
          : "Tu sesión terminó. Inicia sesión nuevamente.",
      403: "Tu usuario no tiene permiso para realizar esta acción.",
      404: "No encontramos este empleado. Es posible que haya sido eliminado.",
      409: "Ya existe un empleado con ese DPI o NIT.",
      422: "Revisa los campos indicados antes de continuar.",
      429: "Has realizado varias solicitudes seguidas. Espera un minuto e inténtalo de nuevo.",
    };
    throw new ApiError(
      response.status,
      messages[response.status] ||
        "El servicio no está disponible. Inténtalo de nuevo en unos momentos.",
      fields,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  login: (username: string, password: string) =>
    request<{ access_token: string }>("/auth/token", {
      method: "POST",
      body: new URLSearchParams({ username, password }),
    }),
  me: (signal?: AbortSignal) => request<User>("/auth/me", { signal }),
  list: (params: URLSearchParams, signal?: AbortSignal) =>
    request<EmployeePage>(`/employees?${params}`, { signal }),
  summary: (signal?: AbortSignal) =>
    request<EmployeeSummary>("/employees/summary", { signal }),
  get: (id: string, signal?: AbortSignal) =>
    request<Employee>(`/employees/${encodeURIComponent(id)}`, { signal }),
  create: (data: EmployeeWrite) =>
    request<Employee>("/employees", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  replace: (id: string, data: EmployeeWrite) =>
    request<Employee>(`/employees/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  salary: (id: string, data: SalaryPatch) =>
    request<Employee>(`/employees/${encodeURIComponent(id)}/salary`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<void>(`/employees/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
