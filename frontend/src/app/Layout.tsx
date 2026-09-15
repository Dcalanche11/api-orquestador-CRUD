import { Link, NavLink, Outlet, Navigate } from "react-router";
import {
  Users,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  ChevronRight,
  CircleHelp,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "./auth";
import { Brand, Button, ErrorState, Loading } from "../components/ui";

export function Layout() {
  const auth = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  if (!auth.token) return <Navigate to="/login" replace />;
  if (auth.loading)
    return <Loading label="Preparando tu espacio de trabajo…" />;
  if (auth.error)
    return (
      <main className="session-error">
        <ErrorState error={auth.error} retry={auth.retry} />
        <Button variant="secondary" onClick={auth.logout}>
          Volver al inicio de sesión
        </Button>
      </main>
    );
  const role =
    auth.user?.role === "HR_ADMIN" ? "Administrador" : "Solo consulta";
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Ir al contenido
      </a>
      {menuOpen && (
        <button
          className="nav-scrim"
          aria-label="Cerrar menú"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <Link
          to="/employees"
          className="brand-link"
          aria-label="PDGE, directorio"
        >
          <Brand />
        </Link>
        <p className="sidebar-caption">ESPACIO DE TRABAJO</p>
        <nav>
          <NavLink
            to="/employees"
            onClick={() => setMenuOpen(false)}
            className="nav-item"
          >
            <Users size={19} />
            <span>Empleados</span>
            <ChevronRight size={15} />
          </NavLink>
        </nav>
        <div className="sidebar-note">
          <span className="note-icon">
            <ShieldCheck size={19} />
          </span>
          <h3>Información que importa</h3>
          <p>Un solo lugar para mantener las fichas de tu equipo al día.</p>
          <span className="note-line" />
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-path">
            <button
              className="icon-button mobile-menu"
              aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? (
                <PanelLeftClose size={21} />
              ) : (
                <PanelLeftOpen size={21} />
              )}
            </button>
            <span>Organización</span>
            <ChevronRight size={14} />
            <strong>Gestión de empleados</strong>
          </div>
          <div className="topbar-account">
            <div className="account-avatar">
              {auth.user?.username.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <strong>{auth.user?.username}</strong>
              <span>{role}</span>
            </div>
            <button
              className="icon-button"
              aria-label="Cerrar sesión"
              onClick={auth.logout}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main id="main-content" className="main-content">
          <Outlet />
        </main>
        <footer className="workspace-footer">
          <span>PDGE · Plataforma de Gestión de Empleados</span>
          <span>
            <CircleHelp size={14} /> ¿Necesitas ayuda? Contacta a tu
            administrador.
          </span>
        </footer>
      </div>
    </div>
  );
}
