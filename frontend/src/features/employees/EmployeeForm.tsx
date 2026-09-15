import { useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import type { FieldPath } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Link,
  Navigate,
  useBeforeUnload,
  useBlocker,
  useNavigate,
  useParams,
} from "react-router";
import {
  BadgeCheck,
  Banknote,
  Check,
  LoaderCircle,
  MapPin,
  Plus,
  Save,
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
import { frequencies, genders, maritalStatuses } from "../../services/format";
import type { Employee, EmployeeWrite } from "../../types/models";
import {
  editableEmployee,
  emptyEmployee,
  newAddress,
  writePayload,
} from "./formData";

export function EmployeeEditor() {
  const { id } = useParams();
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["employee", id],
    queryFn: ({ signal }) => api.get(id!, signal),
    enabled: !!id,
  });
  if (user?.role !== "HR_ADMIN") return <Navigate to="/employees" replace />;
  if (id && query.isPending) return <Loading />;
  if (id && query.isError)
    return (
      <ErrorState
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
    );
  return <EmployeeForm key={id || "new"} employee={query.data} />;
}

function EmployeeForm({ employee }: { employee?: Employee }) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const { token } = useAuth();
  const saved = useRef(false);
  const [error, setError] = useState("");
  const {
    register,
    control,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<EmployeeWrite>({
    defaultValues: employee ? editableEmployee(employee) : emptyEmployee(),
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "addresses",
  });
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !!token &&
      !saved.current &&
      isDirty &&
      currentLocation.pathname !== nextLocation.pathname,
  );
  useBeforeUnload((event) => {
    if (isDirty && !saved.current) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  const back = employee ? `/employees/${employee.id}` : "/employees";
  const submit = async (values: EmployeeWrite) => {
    setError("");
    try {
      const result = employee
        ? await api.replace(employee.id, writePayload(values))
        : await api.create(writePayload(values));
      client.setQueryData(["employee", result.id], result);
      await client.invalidateQueries({ queryKey: ["employees"] });
      saved.current = true;
      navigate(`/employees/${result.id}`, {
        replace: true,
        state: {
          notice: employee
            ? "La ficha se actualizó correctamente."
            : "El empleado se registró correctamente.",
        },
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar la ficha.",
      );
      if (err instanceof ApiError)
        Object.entries(err.fields).forEach(([field, message]) =>
          setFieldError(field as FieldPath<EmployeeWrite>, { message }),
        );
    }
  };
  return (
    <>
      <PageTitle
        back={back}
        eyebrow={employee ? "ACTUALIZAR INFORMACIÓN" : "HACER CRECER TU EQUIPO"}
        title={employee ? "Editar ficha de empleado" : "Un nuevo integrante."}
        description="Completa la información general, identificación y condiciones salariales."
      />
      <div className="editor-layout">
        <form
          id="employee-form"
          className="editor-form"
          onSubmit={(event) => {
            void handleSubmit(submit)(event);
          }}
        >
          {error && <Alert>{error}</Alert>}
          <fieldset disabled={isSubmitting}>
            <section className="panel form-section" id="personal">
              <SectionTitle
                number="01"
                icon={<UserRound size={20} />}
                title="Información personal"
                text="Los datos que identifican a la persona."
              />
              <div className="form-grid">
                <Input
                  label="Nombres"
                  autoComplete="given-name"
                  required
                  maxLength={100}
                  error={errors.first_names?.message}
                  {...register("first_names")}
                />
                <Input
                  label="Apellidos"
                  autoComplete="family-name"
                  required
                  maxLength={100}
                  error={errors.last_names?.message}
                  {...register("last_names")}
                />
                <Select
                  label="Género"
                  required
                  {...register("gender")}
                  error={errors.gender?.message}
                >
                  {Object.entries(genders).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Estado civil"
                  required
                  {...register("marital_status")}
                >
                  {Object.entries(maritalStatuses).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Fecha de nacimiento"
                  type="date"
                  required
                  error={errors.birth_date?.message}
                  hint="La edad se calcula automáticamente al consultar la ficha."
                  {...register("birth_date")}
                />
              </div>
            </section>
            <section className="panel form-section" id="identification">
              <SectionTitle
                number="02"
                icon={<BadgeCheck size={20} />}
                title="Identificación y afiliaciones"
                text="Documentos y registros del empleado."
              />
              <div className="form-grid">
                <Input
                  label="DPI"
                  required
                  inputMode="numeric"
                  pattern="[0-9]{13}"
                  title="El DPI debe tener exactamente 13 dígitos"
                  maxLength={13}
                  placeholder="13 dígitos"
                  error={errors.dpi?.message}
                  {...register("dpi")}
                />
                <Input
                  label="NIT"
                  required
                  maxLength={20}
                  placeholder="Ej. 1234567-8"
                  error={errors.nit?.message}
                  {...register("nit")}
                />
                <Input
                  label="Afiliación IGSS"
                  maxLength={30}
                  pattern="[A-Za-z0-9-]+"
                  placeholder="Opcional"
                  error={errors.igss_number?.message}
                  {...register("igss_number")}
                />
                <Input
                  label="Afiliación IRTRA"
                  maxLength={30}
                  pattern="[A-Za-z0-9-]+"
                  placeholder="Opcional"
                  error={errors.irtra_number?.message}
                  {...register("irtra_number")}
                />
              </div>
            </section>
            <section className="panel form-section" id="addresses">
              <SectionTitle
                number="03"
                icon={<MapPin size={20} />}
                title="Direcciones"
                text="Registra al menos una dirección de contacto."
              />
              {fields.map((field, index) => (
                <div key={field.id} className="address-editor">
                  <div className="address-editor-heading">
                    <span>Dirección {index + 1}</span>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        className="text-button text-danger"
                        aria-label={`Quitar dirección ${index + 1}`}
                        onClick={() => remove(index)}
                      >
                        <Trash2 size={15} /> Quitar
                      </button>
                    )}
                  </div>
                  <div className="form-grid">
                    <Input
                      label={`Dirección ${index + 1}: calle y número`}
                      required
                      wide
                      maxLength={250}
                      placeholder="Calle, avenida, número y zona"
                      error={errors.addresses?.[index]?.line1?.message}
                      {...register(`addresses.${index}.line1`)}
                    />
                    <Input
                      label="Complemento"
                      wide
                      maxLength={250}
                      placeholder="Apartamento, edificio o referencia (opcional)"
                      error={errors.addresses?.[index]?.line2?.message}
                      {...register(`addresses.${index}.line2`)}
                    />
                    <Input
                      label="Municipio"
                      required
                      maxLength={100}
                      error={errors.addresses?.[index]?.municipality?.message}
                      {...register(`addresses.${index}.municipality`)}
                    />
                    <Input
                      label="Departamento"
                      required
                      maxLength={100}
                      error={errors.addresses?.[index]?.department?.message}
                      {...register(`addresses.${index}.department`)}
                    />
                    <Input
                      label="País"
                      required
                      maxLength={2}
                      pattern="[A-Z]{2}"
                      title="Código de dos letras mayúsculas, por ejemplo GT"
                      hint="Código de país, por ejemplo GT."
                      error={errors.addresses?.[index]?.country?.message}
                      {...register(`addresses.${index}.country`)}
                    />
                    <Input
                      label="Código postal"
                      maxLength={12}
                      placeholder="Opcional"
                      error={errors.addresses?.[index]?.postal_code?.message}
                      {...register(`addresses.${index}.postal_code`)}
                    />
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                disabled={fields.length >= 10}
                onClick={() => append(newAddress())}
              >
                <Plus size={16} /> Agregar dirección
              </Button>
            </section>
            <section className="panel form-section" id="salary">
              <SectionTitle
                number="04"
                icon={<Banknote size={20} />}
                title="Información salarial"
                text="Importes correspondientes a la frecuencia de pago seleccionada."
              />
              <div className="form-grid">
                <Input
                  label="Salario base"
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  max="999999999999.99"
                  placeholder="0.00"
                  error={errors.salary?.base_amount?.message}
                  {...register("salary.base_amount")}
                />
                <Input
                  label="Bonificación"
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  max="999999999999.99"
                  error={errors.salary?.bonus_amount?.message}
                  {...register("salary.bonus_amount")}
                />
                <Input
                  label="Moneda"
                  required
                  pattern="[A-Z]{3}"
                  title="Código de tres letras mayúsculas, por ejemplo GTQ"
                  maxLength={3}
                  hint="Código de moneda, por ejemplo GTQ o USD."
                  error={errors.salary?.currency?.message}
                  {...register("salary.currency")}
                />
                <Select
                  label="Frecuencia de pago"
                  required
                  {...register("salary.pay_frequency")}
                >
                  {Object.entries(frequencies).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
            </section>
          </fieldset>
          <div className="form-footer">
            <p>
              <Check size={16} /> Los campos con{" "}
              <span className="required">*</span> son obligatorios.
            </p>
            <div>
              <Link
                className={`btn btn-secondary ${isSubmitting ? "disabled-link" : ""}`}
                to={back}
              >
                Cancelar
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <LoaderCircle size={17} className="animate-spin" />
                ) : (
                  <Save size={17} />
                )}{" "}
                {isSubmitting
                  ? "Guardando…"
                  : employee
                    ? "Guardar cambios"
                    : "Registrar empleado"}
              </Button>
            </div>
          </div>
        </form>
        <aside className="editor-aside">
          <span className="eyebrow">EN ESTA FICHA</span>
          <a href="#personal">
            <span>01</span> Información personal
          </a>
          <a href="#identification">
            <span>02</span> Identificación
          </a>
          <a href="#addresses">
            <span>03</span> Direcciones
          </a>
          <a href="#salary">
            <span>04</span> Información salarial
          </a>
          <div className="editor-tip">
            <BadgeCheck size={22} />
            <h3>
              Una ficha completa,
              <br />
              un equipo organizado.
            </h3>
            <p>
              Revisa el DPI y el NIT antes de guardar. Cada empleado debe tener
              una identificación única.
            </p>
          </div>
        </aside>
      </div>
      {blocker.state === "blocked" && (
        <Modal title="¿Salir sin guardar?" onClose={() => blocker.reset()}>
          <p className="modal-description">
            Los cambios de esta ficha todavía no se han guardado.
          </p>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => blocker.reset()}>
              Seguir editando
            </Button>
            <Button variant="danger" onClick={() => blocker.proceed()}>
              Salir sin guardar
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

function SectionTitle({
  number,
  icon,
  title,
  text,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="section-title">
      <span className="section-icon">{icon}</span>
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      <span className="section-number">{number}</span>
    </div>
  );
}
