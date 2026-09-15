import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import type { FieldPath } from "react-hook-form";
import {
  BadgeCheck,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Fingerprint,
  LoaderCircle,
  MapPin,
  Pencil,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { useAuth } from "../../app/auth";
import {
  Alert,
  Button,
  ErrorState,
  Input,
  Loading,
  Modal,
  PageTitle,
  Select,
} from "../../components/ui";
import { api, ApiError } from "../../services/api";
import {
  dateLabel,
  frequencies,
  genders,
  initials,
  maritalStatuses,
  money,
  salaryLabel,
} from "../../services/format";
import type { Employee, Salary } from "../../types/models";

export function EmployeeDetail() {
  const { id = "" } = useParams();
  const query = useQuery({
    queryKey: ["employee", id],
    queryFn: ({ signal }) => api.get(id, signal),
  });
  if (query.isPending) return <Loading />;
  if (query.isError)
    return (
      <>
        <Link className="back-link" to="/employees">
          ← Volver al directorio
        </Link>
        <ErrorState
          error={query.error}
          retry={() => {
            void query.refetch();
          }}
        />
      </>
    );
  return <DetailContent employee={query.data} />;
}

function DetailContent({ employee }: { employee: Employee }) {
  const admin = useAuth().user?.role === "HR_ADMIN";
  const location = useLocation();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [modal, setModal] = useState<"salary" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(
    (location.state as { notice?: string } | null)?.notice || "",
  );
  const deleteEmployee = async () => {
    setBusy(true);
    setError("");
    try {
      await api.delete(employee.id);
      client.removeQueries({ queryKey: ["employee", employee.id] });
      await client.invalidateQueries({ queryKey: ["employees"] });
      navigate("/employees", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar.");
      setBusy(false);
    }
  };
  return (
    <>
      <PageTitle
        back="/employees"
        eyebrow="DIRECTORIO DE EMPLEADOS"
        title="Ficha del empleado"
        description="Información personal y laboral, reunida en un solo lugar."
        actions={
          admin && (
            <>
              <Button
                variant="secondary"
                className="delete-outline"
                onClick={() => {
                  setError("");
                  setModal("delete");
                }}
              >
                <Trash2 size={17} /> Eliminar
              </Button>
              <Link
                className="btn btn-primary"
                to={`/employees/${employee.id}/edit`}
              >
                <Pencil size={17} /> Editar ficha
              </Link>
            </>
          )
        }
      />
      {notice && (
        <div className="success-notice" role="status">
          <CheckCircle2 size={18} />
          {notice}
          <button aria-label="Cerrar aviso" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
      <section className="panel profile-banner">
        <span className="profile-avatar">{initials(employee)}</span>
        <div className="profile-name">
          <span className="eyebrow">INFORMACIÓN DEL EMPLEADO</span>
          <h2>
            {employee.first_names}
            <br className="profile-name-break" /> {employee.last_names}
          </h2>
          <div className="profile-meta">
            <span>
              <Fingerprint size={15} />
              {employee.dpi}
            </span>
            <span>
              <MapPin size={15} />
              {employee.addresses[0]?.municipality},{" "}
              {employee.addresses[0]?.department}
            </span>
          </div>
        </div>
        <div className="profile-age">
          <strong>{employee.age}</strong>
          <span>años de edad</span>
          <small>Información actualizada</small>
        </div>
      </section>
      <div className="detail-grid">
        <div className="detail-main">
          <section className="panel detail-section">
            <h3>
              <UserRound size={19} /> Información personal
            </h3>
            <dl className="data-grid">
              <Datum label="Nombres" value={employee.first_names} />
              <Datum label="Apellidos" value={employee.last_names} />
              <Datum label="Género" value={genders[employee.gender]} />
              <Datum
                label="Estado civil"
                value={maritalStatuses[employee.marital_status]}
              />
              <Datum
                label="Fecha de nacimiento"
                value={dateLabel(employee.birth_date)}
              />
              <Datum label="Edad" value={`${employee.age} años`} />
            </dl>
          </section>
          <section className="panel detail-section">
            <h3>
              <BadgeCheck size={19} /> Identificación y afiliaciones
            </h3>
            <dl className="data-grid">
              <Datum
                label="Documento personal de identificación"
                value={employee.dpi}
              />
              <Datum
                label="Número de identificación tributaria"
                value={employee.nit}
              />
              <Datum label="Afiliación IGSS" value={employee.igss_number} />
              <Datum label="Afiliación IRTRA" value={employee.irtra_number} />
            </dl>
          </section>
          <section className="panel detail-section">
            <h3>
              <MapPin size={19} /> Direcciones{" "}
              <span className="count-badge">{employee.addresses.length}</span>
            </h3>
            <div className="address-list">
              {employee.addresses.map((address, index) => (
                <article className="address-card" key={index}>
                  <span className="address-pin">
                    <MapPin size={19} />
                  </span>
                  <div>
                    <span className="eyebrow">DIRECCIÓN {index + 1}</span>
                    <h4>{address.line1}</h4>
                    {address.line2 && <p>{address.line2}</p>}
                    <p>
                      {address.municipality}, {address.department} ·{" "}
                      {address.country}
                    </p>
                    {address.postal_code && (
                      <small>Código postal: {address.postal_code}</small>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
        <aside className="detail-aside">
          <section className="salary-card">
            <div className="salary-card-heading">
              <span>
                <Banknote size={20} /> Información salarial
              </span>
              <span className="salary-currency">
                {employee.salary.currency}
              </span>
            </div>
            <p className="salary-caption">SALARIO BASE</p>
            <strong className="salary-amount">
              {money(
                employee.salary.base_amount,
                employee.salary.currency || "GTQ",
              )}
            </strong>
            <span className="frequency-pill">
              <CalendarDays size={14} />
              {salaryLabel(employee.salary)}
            </span>
            <div className="bonus-row">
              <span>Bonificación</span>
              <strong>
                {money(
                  employee.salary.bonus_amount || "0",
                  employee.salary.currency || "GTQ",
                )}
              </strong>
            </div>
            <p className="salary-note">
              Importes correspondientes a cada período de pago.
            </p>
            {admin && (
              <button
                className="salary-edit"
                onClick={() => setModal("salary")}
              >
                <Pencil size={16} /> Actualizar salario
              </button>
            )}
          </section>
          <section className="panel record-info">
            <h3>
              <Clock3 size={17} /> Historial de la ficha
            </h3>
            <dl>
              <Datum
                label="Fecha de registro"
                value={dateLabel(employee.created_at)}
              />
              <Datum
                label="Última actualización"
                value={dateLabel(employee.updated_at)}
              />
            </dl>
            <p>
              <ShieldCheck size={16} /> Los cambios quedan registrados en la
              bitácora de auditoría.
            </p>
          </section>
        </aside>
      </div>
      {modal === "salary" && admin && (
        <SalaryEditor
          employee={employee}
          close={() => setModal(null)}
          saved={() => {
            setModal(null);
            setNotice("La información salarial se actualizó correctamente.");
          }}
        />
      )}{" "}
      {modal === "delete" && (
        <Modal
          title="¿Eliminar este empleado?"
          busy={busy}
          onClose={() => setModal(null)}
        >
          <p className="modal-description">
            Se eliminará la ficha de{" "}
            <strong>
              {employee.first_names} {employee.last_names}
            </strong>
            , junto con sus direcciones e información salarial. La auditoría se
            conservará.
          </p>
          <p className="delete-warning">Esta acción no se puede deshacer.</p>
          {error && <Alert>{error}</Alert>}
          <div className="modal-actions">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setModal(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => {
                void deleteEmployee();
              }}
            >
              {busy && <LoaderCircle size={16} className="animate-spin" />}
              Eliminar empleado
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

function Datum({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className={!value ? "not-provided" : ""}>
        {value || "No registrado"}
      </dd>
    </div>
  );
}

function SalaryEditor({
  employee,
  close,
  saved,
}: {
  employee: Employee;
  close: () => void;
  saved: () => void;
}) {
  const client = useQueryClient();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { isSubmitting, errors },
  } = useForm<Salary>({ defaultValues: employee.salary });
  return (
    <Modal
      title="Actualizar información salarial"
      onClose={close}
      busy={isSubmitting}
    >
      <p className="modal-description">
        {employee.first_names} {employee.last_names}
      </p>
      <form
        onSubmit={handleSubmit(async (values) => {
          setError("");
          try {
            const result = await api.salary(employee.id, values);
            client.setQueryData(["employee", employee.id], result);
            await client.invalidateQueries({ queryKey: ["employees"] });
            saved();
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "No se pudo guardar.",
            );
            if (err instanceof ApiError)
              Object.entries(err.fields).forEach(([field, message]) =>
                setFieldError(field as FieldPath<Salary>, { message }),
              );
          }
        })}
      >
        {error && <Alert>{error}</Alert>}
        <fieldset disabled={isSubmitting} className="form-grid">
          <Input
            label="Salario base"
            required
            type="number"
            min="0"
            step="0.01"
            max="999999999999.99"
            error={errors.base_amount?.message}
            {...register("base_amount")}
          />
          <Input
            label="Bonificación"
            required
            type="number"
            min="0"
            step="0.01"
            max="999999999999.99"
            error={errors.bonus_amount?.message}
            {...register("bonus_amount")}
          />
          <Input
            label="Moneda"
            required
            pattern="[A-Z]{3}"
            maxLength={3}
            error={errors.currency?.message}
            {...register("currency")}
          />
          <Select
            label="Frecuencia de pago"
            required
            {...register("pay_frequency")}
          >
            {Object.entries(frequencies).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </fieldset>
        <div className="modal-actions">
          <Button
            type="button"
            variant="secondary"
            disabled={isSubmitting}
            onClick={close}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && (
              <LoaderCircle size={16} className="animate-spin" />
            )}
            Guardar salario
          </Button>
        </div>
      </form>
    </Modal>
  );
}
