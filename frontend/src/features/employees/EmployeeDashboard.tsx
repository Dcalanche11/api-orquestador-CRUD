import { useQuery } from "@tanstack/react-query";
import { Users, ShieldCheck, BadgeCheck, MapPin } from "lucide-react";
import { api } from "../../services/api";
import { frequencies, genders, money } from "../../services/format";
import { ErrorState, Loading } from "../../components/ui";

export function EmployeeDashboard() {
  const query = useQuery({
    queryKey: ["employees", "summary"],
    queryFn: ({ signal }) => api.summary(signal),
  });
  if (query.isPending) return <Loading label="Cargando resumen…" />;
  if (query.isError)
    return (
      <ErrorState
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
    );
  const data = query.data;
  const metrics = [
    { label: "Empleados registrados", value: data.total, Icon: Users },
    {
      label: "Con afiliación al IGSS",
      value: data.igss_count,
      Icon: ShieldCheck,
    },
    {
      label: "Con afiliación al IRTRA",
      value: data.irtra_count,
      Icon: BadgeCheck,
    },
    {
      label: "Direcciones registradas",
      value: data.address_count,
      Icon: MapPin,
    },
  ];
  return (
    <section className="employee-dashboard" aria-label="Dashboard de empleados">
      <div className="dashboard-intro">
        <h2>Resumen general</h2>
        <p>Información de todos los empleados registrados.</p>
      </div>
      <div className="dashboard-metrics">
        {metrics.map(({ label, value, Icon }) => (
          <article className="panel metric-card" key={label} aria-label={label}>
            <span className="metric-icon">
              <Icon size={21} />
            </span>
            <p>{label}</p>
            <strong>{value.toLocaleString("es-GT")}</strong>
          </article>
        ))}
      </div>
      {!data.total ? (
        <div className="panel empty-state">
          <Users size={28} />
          <h3>Aún no hay empleados registrados</h3>
          <p>El resumen se actualizará al registrar el primer empleado.</p>
        </div>
      ) : (
        <div className="dashboard-grid">
          <section className="panel dashboard-panel">
            <h3>Distribución por género</h3>
            <p>Personas registradas en cada categoría.</p>
            <div className="gender-chart">
              {Object.entries(genders).map(([key, label]) => {
                const count =
                  data.genders.find((item) => item.gender === key)?.count || 0;
                return (
                  <div className="gender-row" key={key}>
                    <div>
                      <span>{label}</span>
                      <strong>{count}</strong>
                    </div>
                    <progress
                      aria-label={label}
                      value={count}
                      max={data.total}
                    />
                  </div>
                );
              })}
            </div>
          </section>
          <section className="panel dashboard-panel salary-summary">
            <h3>Resumen salarial</h3>
            <p>Totales separados por moneda y frecuencia de pago.</p>
            <div className="table-scroll">
              <table className="summary-table">
                <caption className="sr-only">
                  Totales salariales de todos los empleados
                </caption>
                <thead>
                  <tr>
                    <th>Grupo de pago</th>
                    <th>Empleados</th>
                    <th>Salario base total</th>
                    <th>Bonificaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {data.salaries.map((group) => (
                    <tr key={`${group.currency}-${group.pay_frequency}`}>
                      <td>
                        <strong>{group.currency}</strong>
                        <small>{frequencies[group.pay_frequency]}</small>
                      </td>
                      <td>{group.employee_count}</td>
                      <td>{money(group.base_total, group.currency)}</td>
                      <td>{money(group.bonus_total, group.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
