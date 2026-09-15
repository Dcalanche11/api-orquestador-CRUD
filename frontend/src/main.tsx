import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createBrowserRouter,
  Link,
  Navigate,
  RouterProvider,
} from "react-router";
import { AuthProvider } from "./app/auth";
import { Layout } from "./app/Layout";
import { Login } from "./app/Login";
import { EmployeeList } from "./features/employees/EmployeeList";
import { EmployeeDetail } from "./features/employees/EmployeeDetail";
import { EmployeeEditor } from "./features/employees/EmployeeForm";
import "@fontsource-variable/montserrat";
import "./styles.css";

const client = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 15_000 } },
});
const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/employees" replace /> },
      { path: "/employees", element: <EmployeeList /> },
      { path: "/employees/new", element: <EmployeeEditor /> },
      { path: "/employees/:id", element: <EmployeeDetail /> },
      { path: "/employees/:id/edit", element: <EmployeeEditor /> },
      {
        path: "*",
        element: (
          <div className="state">
            <h1>Página no encontrada</h1>
            <Link className="btn btn-primary" to="/employees">
              Volver al directorio
            </Link>
          </div>
        ),
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
