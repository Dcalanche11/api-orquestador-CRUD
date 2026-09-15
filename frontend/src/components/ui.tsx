import { useEffect, useRef } from "react";
import type {
  ReactNode,
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
} from "react";
import { AlertCircle, ArrowLeft, LoaderCircle, X } from "lucide-react";
import { Link } from "react-router";

export function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark" aria-hidden="true">
        P
      </span>
      <span>PDGE</span>
    </span>
  );
}
export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  return (
    <button className={`btn btn-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function Loading({
  label = "Cargando información…",
}: {
  label?: string;
}) {
  return (
    <div className="state" role="status">
      <LoaderCircle className="animate-spin" size={25} />
      <p>{label}</p>
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: Error;
  retry?: () => void;
}) {
  return (
    <div className="state">
      <AlertCircle size={28} />
      <h2>No pudimos cargar la información</h2>
      <p role="alert">{error.message}</p>
      {retry && (
        <Button variant="secondary" onClick={retry}>
          Volver a intentar
        </Button>
      )}
    </div>
  );
}
export function Alert({ children }: { children: ReactNode }) {
  return (
    <div className="alert" role="alert">
      <AlertCircle size={18} />
      <span>{children}</span>
    </div>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
  actions,
  back,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  back?: string;
}) {
  return (
    <header className="page-heading">
      {back && (
        <Link className="back-link" to={back}>
          <ArrowLeft size={15} /> Volver
        </Link>
      )}
      <div className="heading-row">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          {description && <p className="page-description">{description}</p>}
        </div>
        <div className="heading-actions">{actions}</div>
      </div>
    </header>
  );
}
type FieldProps = {
  label: string;
  error?: string;
  hint?: string;
  wide?: boolean;
};
export function Input({
  label,
  error,
  hint,
  wide,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & FieldProps) {
  const fieldId = id || props.name || label;
  return (
    <div className={`field ${wide ? "field-wide" : ""}`}>
      <label htmlFor={fieldId}>
        {label}
        {props.required && (
          <span className="required" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>
      <input
        id={fieldId}
        aria-label={label}
        aria-invalid={!!error}
        aria-describedby={error || hint ? `${fieldId}-help` : undefined}
        {...props}
      />
      {(error || hint) && (
        <small
          id={`${fieldId}-help`}
          className={error ? "field-error" : "field-hint"}
        >
          {error || hint}
        </small>
      )}
    </div>
  );
}
export function Select({
  label,
  error,
  children,
  id,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & FieldProps) {
  const fieldId = id || props.name || label;
  return (
    <div className="field">
      <label htmlFor={fieldId}>
        {label}
        {props.required && (
          <span className="required" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>
      <select
        id={fieldId}
        aria-label={label}
        aria-invalid={!!error}
        aria-describedby={error ? `${fieldId}-help` : undefined}
        {...props}
      >
        {children}
      </select>
      {error && (
        <small className="field-error" id={`${fieldId}-help`}>
          {error}
        </small>
      )}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      className="modal"
      ref={ref}
      aria-labelledby="modal-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="modal-heading">
        <h2 id="modal-title">{title}</h2>
        <button
          className="icon-button"
          aria-label="Cerrar ventana"
          onClick={onClose}
          disabled={busy}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
