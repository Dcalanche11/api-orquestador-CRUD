import { useState } from "react";
import { Navigate } from "react-router";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Users,
  ShieldCheck,
  LoaderCircle,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { useAuth } from "./auth";
import { Alert, Brand, Button, Input } from "../components/ui";

export function Login() {
  const auth = useAuth();
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<{ username: string; password: string }>();
  if (auth.token) return <Navigate to="/employees" replace />;
  return (
    <main className="login-page">
      <section className="login-story">
        <Brand />
        <div className="login-story-content">
          <span className="pill">
            <span className="status-dot" /> GESTIÓN DE PERSONAS
          </span>
          <h1>
            Todo empieza
            <br />
            con tu <em>equipo.</em>
          </h1>
          <p>
            Un espacio para cuidar la información de las personas que hacen
            crecer tu organización.
          </p>
          <div className="orbit-art" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="orbit-center">
              <Users size={40} />
            </div>
            <div className="orbit-card">
              <ShieldCheck size={22} />
              <span>
                Información organizada
                <br />
                <strong>Personas conectadas</strong>
              </span>
            </div>
            <span className="orbit-spark spark-one" />
            <span className="orbit-spark spark-two" />
          </div>
        </div>
        <p className="login-footer">
          Personas primero. Información en su lugar.
        </p>
      </section>
      <section className="login-panel">
        <div className="login-form">
          <div className="login-icon">
            <LockKeyhole size={23} />
          </div>
          <p className="eyebrow">BIENVENIDO A PDGE</p>
          <h2>Tu equipo, más cerca.</h2>
          <p className="muted">
            Plataforma de Gestión de Empleados. Ingresa con tu cuenta para
            acceder al directorio.
          </p>
          {auth.expired && (
            <Alert>Tu sesión terminó. Ingresa nuevamente para continuar.</Alert>
          )}
          {error && <Alert>{error}</Alert>}
          <form
            onSubmit={handleSubmit(async (data) => {
              setError("");
              try {
                await auth.login(data.username.trim(), data.password);
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "No se pudo iniciar sesión.",
                );
              }
            })}
          >
            <Input
              label="Usuario"
              placeholder="Ingresa tu usuario"
              autoComplete="username"
              required
              {...register("username")}
            />
            <div className="password-field">
              <Input
                label="Contraseña"
                placeholder="Ingresa tu contraseña"
                type={visible ? "text" : "password"}
                autoComplete="current-password"
                required
                {...register("password")}
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={
                  visible ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="login-submit"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="animate-spin" size={18} />{" "}
                  Ingresando…
                </>
              ) : (
                <>
                  Iniciar sesión <ArrowRight size={18} />
                </>
              )}
            </Button>
          </form>
          <div className="login-help">
            <ShieldCheck size={18} />
            <p>
              Acceso exclusivo para usuarios autorizados.
              <br />
              Si necesitas una cuenta, contacta a tu administrador.
            </p>
          </div>
        </div>
        <p className="login-bottom">
          PDGE <span>•</span> GESTIÓN DE EMPLEADOS
        </p>
      </section>
    </main>
  );
}
