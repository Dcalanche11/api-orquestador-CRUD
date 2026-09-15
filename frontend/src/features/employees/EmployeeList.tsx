import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams, useNavigate } from "react-router";
import {
  List,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  Fingerprint,
  Plus,
  Search,
  Users,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { useAuth } from "../../app/auth";
import { api } from "../../services/api";
import { initials, money, salaryLabel } from "../../services/format";
import { Button, ErrorState, Loading } from "../../components/ui";

import { EmployeeDashboard } from "./EmployeeDashboard";

export function EmployeeList() {
  const auth = useAuth();
  const navigate = useNavigate();
  const admin = auth.user?.role === "HR_ADMIN";
  const [search, setSearch] = useSearchParams();
  const dashboard = search.get("view") === "dashboard";
  const name = search.get("name") || "";
  const dpi = search.get("dpi") || "";
  const parsedLimit = Number(search.get("limit") || 10);
  const limit = [10, 20, 50].includes(parsedLimit) ? parsedLimit : 10;
  const parsedOffset = Number(search.get("offset") || 0);
  const offset =
    Number.isSafeInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;
  const params = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
  });
  if (name) params.set("name", name);
  if (dpi) params.set("dpi", dpi);
  const query = useQuery({
    queryKey: ["employees", params.toString()],
    enabled: !dashboard,
    queryFn: ({ signal }) => api.list(params, signal),
  });
  const page = query.data;
  const filtered = !!(name || dpi);
  const changePage = (next: number) => {
    const value = new URLSearchParams(search);
    value.set("offset", String(next));
    setSearch(value);
  };
  return (
    <>
      <section className="employees-heading">
        <div className="employees-title">
          <h1>Empleados</h1>
          <div
            className="view-switch"
            role="group"
            aria-label="Vista de empleados"
          >
            <button
              aria-pressed={!dashboard}
              onClick={() => {
                const next = new URLSearchParams(search);
                next.delete("view");
                setSearch(next);
              }}
            >
              <List size={18} /> Tabla
            </button>
            <button
              aria-pressed={dashboard}
              onClick={() => {
                const next = new URLSearchParams(search);
                next.set("view", "dashboard");
                setSearch(next);
              }}
            >
              <ChartNoAxesCombined size={18} /> Dashboard
            </button>
          </div>
        </div>
        {admin && (
          <Link className="btn btn-primary" to="/employees/new">
            <Plus size={17} /> Nuevo empleado
          </Link>
        )}
      </section>
      {dashboard ? (
        <EmployeeDashboard />
      ) : (
        <section className="panel directory-panel" aria-label="Directorio">
          <div className="directory-toolbar">
            <h2>
              {filtered ? "Resultados" : "Todos los empleados"}{" "}
              {page && <span className="count-badge">{page.total}</span>}
            </h2>
            <span>Selecciona un registro para abrir su ficha</span>
          </div>
          <form
            className="filter-bar"
            key={`${name}|${dpi}`}
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              const next = new URLSearchParams({ limit: String(limit) });
              const n = String(form.get("name") || "").trim();
              const d = String(form.get("dpi") || "").trim();
              if (n) next.set("name", n);
              if (d) next.set("dpi", d);
              setSearch(next);
            }}
          >
            <label className="search-field">
              <Search size={18} />
              <span className="sr-only">Buscar por nombre</span>
              <input
                name="name"
                aria-label="Buscar por nombre"
                placeholder="Buscar por nombres o apellidos…"
                defaultValue={name}
                maxLength={100}
              />
            </label>
            <label className="search-field dpi-search">
              <Fingerprint size={18} />
              <span className="sr-only">Buscar por DPI</span>
              <input
                name="dpi"
                aria-label="Buscar por DPI"
                placeholder="DPI del empleado"
                defaultValue={dpi}
                pattern="[0-9]{13}"
                title="Ingresa los 13 dígitos del DPI"
                maxLength={13}
                inputMode="numeric"
              />
            </label>
            <Button variant="secondary" type="submit">
              <SlidersHorizontal size={16} /> Filtrar
            </Button>
            {filtered && (
              <button
                className="icon-button"
                type="button"
                onClick={() => setSearch({ limit: String(limit) })}
                aria-label="Limpiar filtros"
              >
                <X size={18} />
              </button>
            )}
          </form>
          {query.isPending ? (
            <Loading />
          ) : query.isError ? (
            <ErrorState
              error={query.error}
              retry={() => {
                void query.refetch();
              }}
            />
          ) : page && !page.items.length ? (
            <div className="empty-state">
              <span className="empty-icon">
                <Users size={30} />
              </span>
              <h3>
                {filtered
                  ? "No encontramos coincidencias"
                  : offset
                    ? "Esta página está vacía"
                    : "Aquí empieza la historia de tu equipo"}
              </h3>
              <p>
                {filtered
                  ? "Prueba con otro nombre o verifica los 13 dígitos del DPI."
                  : offset
                    ? "Vuelve a la primera página para consultar el directorio."
                    : "Las fichas de los empleados aparecerán aquí cuando se registren."}
              </p>
              {filtered ? (
                <Button variant="secondary" onClick={() => setSearch({})}>
                  Limpiar filtros
                </Button>
              ) : offset ? (
                <Button variant="secondary" onClick={() => changePage(0)}>
                  Ir a la primera página
                </Button>
              ) : (
                admin && (
                  <Link className="btn btn-primary" to="/employees/new">
                    <Plus size={16} /> Registrar primer empleado
                  </Link>
                )
              )}
            </div>
          ) : (
            page && (
              <>
                <div className="table-scroll">
                  <table className="employee-table">
                    <thead>
                      <tr>
                        <th>Empleado</th>
                        <th>Identificación</th>
                        <th>Ubicación</th>
                        <th>Salario base</th>
                      </tr>
                    </thead>
                    <tbody>
                      {page.items.map((employee, index) => (
                        <tr
                          key={employee.id}
                          className="employee-row"
                          tabIndex={0}
                          aria-label={`Abrir ficha de ${employee.first_names} ${employee.last_names}`}
                          onClick={(event) => {
                            if (
                              !(event.target as HTMLElement).closest("a") &&
                              !window.getSelection()?.toString()
                            )
                              navigate(`/employees/${employee.id}`);
                          }}
                          onKeyDown={(event) => {
                            if (
                              event.target === event.currentTarget &&
                              (event.key === "Enter" || event.key === " ")
                            ) {
                              event.preventDefault();
                              navigate(`/employees/${employee.id}`);
                            }
                          }}
                        >
                          <td>
                            <Link
                              className="employee-identity"
                              aria-label={`Ver ficha de ${employee.first_names} ${employee.last_names}`}
                              to={`/employees/${employee.id}`}
                            >
                              <span className={`avatar avatar-${index % 4}`}>
                                {initials(employee)}
                              </span>
                              <span>
                                <strong>
                                  {employee.first_names} {employee.last_names}
                                </strong>
                                <small>
                                  {employee.age} años{" "}
                                  <span className="dot-separator">·</span> Ficha
                                  de empleado
                                </small>
                              </span>
                            </Link>
                          </td>
                          <td>
                            <span className="table-mono">{employee.dpi}</span>
                            <small>NIT {employee.nit}</small>
                          </td>
                          <td>
                            <span>
                              {employee.addresses[0]?.municipality || "—"}
                            </span>
                            <small>
                              {employee.addresses[0]?.department || "—"}
                            </small>
                          </td>
                          <td>
                            <span className="salary-value">
                              {money(
                                employee.salary.base_amount,
                                employee.salary.currency || "GTQ",
                              )}
                            </span>
                            <small>{salaryLabel(employee.salary)}</small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="pagination">
                  <p>
                    Mostrando{" "}
                    <strong>
                      {offset + 1}–{offset + page.items.length}
                    </strong>{" "}
                    de <strong>{page.total}</strong> empleados
                  </p>
                  <div className="pagination-controls">
                    <label>
                      Por página{" "}
                      <select
                        aria-label="Empleados por página"
                        value={limit}
                        onChange={(e) => {
                          const value = new URLSearchParams(search);
                          value.set("limit", e.target.value);
                          value.delete("offset");
                          setSearch(value);
                        }}
                      >
                        {[10, 20, 50].map((n) => (
                          <option key={n}>{n}</option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="icon-button"
                      aria-label="Página anterior"
                      disabled={!offset}
                      onClick={() => changePage(Math.max(0, offset - limit))}
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span className="page-number">
                      {Math.floor(offset / limit) + 1}
                    </span>
                    <button
                      className="icon-button"
                      aria-label="Página siguiente"
                      disabled={offset + limit >= page.total}
                      onClick={() => changePage(offset + limit)}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </>
            )
          )}
        </section>
      )}
    </>
  );
}
