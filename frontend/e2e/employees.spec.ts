import { test, expect } from "@playwright/test";
import type { Page, APIRequestContext } from "@playwright/test";

const password = "e2e-only-password-123";
async function login(page: Page, user = "e2e-admin") {
  await page.goto("/login");
  await page.getByLabel("Usuario", { exact: true }).fill(user);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(
    page.getByRole("heading", { name: "Empleados", exact: true }),
  ).toBeVisible();
}
async function fillEmployee(page: Page, dpi: string) {
  await page.getByLabel("Nombres", { exact: true }).fill("María Elena");
  await page.getByLabel("Apellidos", { exact: true }).fill("García López");
  await page.getByLabel("Género", { exact: true }).selectOption("FEMALE");
  await page.getByLabel("Fecha de nacimiento").fill("1993-04-12");
  await page.getByLabel("DPI", { exact: true }).fill(dpi);
  await page.getByLabel("NIT", { exact: true }).fill(dpi + "-K");
  await page
    .getByLabel("Dirección 1: calle y número")
    .fill("Avenida Reforma 8-20, zona 10");
  await page.getByLabel("Municipio", { exact: true }).first().fill("Guatemala");
  await page
    .getByLabel("Departamento", { exact: true })
    .first()
    .fill("Guatemala");
  await page.getByLabel("Salario base", { exact: true }).fill("6500.00");
  await page.getByLabel("Bonificación", { exact: true }).fill("250.00");
}
async function seed(
  request: APIRequestContext,
  dpi: string,
  firstNames = "Carlos Andrés",
) {
  const auth = await request.post("http://127.0.0.1:8001/api/v1/auth/token", {
    form: { username: "e2e-admin", password },
  });
  const { access_token } = (await auth.json()) as { access_token: string };
  const headers = { Authorization: `Bearer ${access_token}` };
  const response = await request.post(
    "http://127.0.0.1:8001/api/v1/employees",
    {
      headers,
      data: {
        first_names: firstNames,
        last_names: "Morales",
        gender: "MALE",
        marital_status: "SINGLE",
        birth_date: "1990-05-20",
        dpi,
        nit: dpi + "K",
        addresses: [
          {
            line1: "Zona 1",
            municipality: "Antigua Guatemala",
            department: "Sacatepéquez",
            country: "GT",
          },
        ],
        salary: {
          base_amount: "8500.00",
          bonus_amount: "250.00",
          currency: "GTQ",
          pay_frequency: "MONTHLY",
        },
      },
    },
  );
  expect(response.status()).toBe(201);
  const body = (await response.json()) as { id: string };
  return { id: body.id, headers };
}

test("login, CRUD completo, direcciones, persistencia y confirmación de borrado", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/login");
  await page.screenshot({
    path: "test-results/login-desktop.png",
    fullPage: true,
  });
  await login(page);
  await expect(
    page.getByText("Aquí empieza la historia de tu equipo"),
  ).toBeVisible();
  await page.getByRole("link", { name: "Nuevo empleado", exact: true }).click();
  await fillEmployee(page, "1000000000101");
  await page.getByRole("button", { name: "Agregar dirección" }).click();
  await page
    .getByLabel("Dirección 2: calle y número")
    .fill("Calle del Arco 4-15");
  await page
    .getByLabel("Municipio", { exact: true })
    .nth(1)
    .fill("Antigua Guatemala");
  await page
    .getByLabel("Departamento", { exact: true })
    .nth(1)
    .fill("Sacatepéquez");
  await page.screenshot({
    path: "test-results/form-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Registrar empleado", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ficha del empleado", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Calle del Arco 4-15", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/detail-desktop.png",
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Ficha del empleado", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Editar ficha", exact: true }).click();
  await page.getByLabel("Nombres", { exact: true }).fill("María Fernanda");
  await page.getByRole("button", { name: "Quitar dirección 2" }).click();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(
    page.getByText("La ficha se actualizó correctamente."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Actualizar salario" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Salario base", { exact: true })
    .fill("7250.50");
  await page.getByRole("button", { name: "Guardar salario" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByText(/7,250.50/)).toBeVisible();
  await page.getByRole("link", { name: "Volver", exact: true }).click();
  await page.getByLabel("Buscar por nombre").fill("María Fernanda");
  await page.getByRole("button", { name: "Filtrar", exact: true }).click();
  await expect(page.getByRole("row", { name: /María Fernanda/ })).toBeVisible();
  await page.screenshot({
    path: "test-results/directory-desktop.png",
    fullPage: true,
  });
  await page.getByLabel("Buscar por DPI").fill("9999999999999");
  await page.getByRole("button", { name: "Filtrar", exact: true }).click();
  await expect(page.getByText("No encontramos coincidencias")).toBeVisible();
  await page
    .getByRole("button", { name: "Limpiar filtros", exact: true })
    .first()
    .click();
  await page
    .getByRole("link", { name: "Ver ficha de María Fernanda García López" })
    .click();
  await page.getByRole("button", { name: "Eliminar", exact: true }).click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Ficha del empleado", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Eliminar", exact: true }).click();
  await page
    .getByRole("button", { name: "Eliminar empleado", exact: true })
    .click();
  await expect(
    page.getByText("Aquí empieza la historia de tu equipo"),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("errores de login, validación de servidor y cambios sin guardar", async ({
  page,
  request,
}) => {
  const record = await seed(request, "2000000000101");
  await page.goto("/login");
  await page.getByLabel("Usuario", { exact: true }).fill("e2e-admin");
  await page.getByLabel("Contraseña", { exact: true }).fill("incorrecta");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Usuario o contraseña incorrectos",
  );
  await login(page);
  await page.getByRole("link", { name: "Nuevo empleado", exact: true }).click();
  await fillEmployee(page, "2000000000101");
  await page
    .getByRole("button", { name: "Registrar empleado", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Ya existe un empleado");
  await page.getByLabel("DPI", { exact: true }).fill("2000000000102");
  await page.getByLabel("NIT", { exact: true }).fill("2000000000102K");
  await page.getByLabel("Fecha de nacimiento").fill("2999-01-01");
  await page
    .getByRole("button", { name: "Registrar empleado", exact: true })
    .click();
  await expect(
    page.getByText("La fecha no puede estar en el futuro.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Cancelar", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Seguir editando" }).click();
  await expect(page.getByLabel("Nombres", { exact: true })).toHaveValue(
    "María Elena",
  );
  await page.getByRole("link", { name: "Cancelar", exact: true }).click();
  await page
    .getByRole("button", { name: "Salir sin guardar", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Empleados", exact: true }),
  ).toBeVisible();
  await request.delete(`http://127.0.0.1:8001/api/v1/employees/${record.id}`, {
    headers: record.headers,
  });
});

test("rol de consulta, rutas protegidas y sesión expirada", async ({
  page,
  request,
}) => {
  const record = await seed(request, "3000000000101");
  await login(page, "e2e-viewer");
  await expect(
    page.getByRole("link", { name: "Nuevo empleado", exact: true }),
  ).toHaveCount(0);
  await page.goto(`/employees/${record.id}`);
  await expect(
    page.getByRole("heading", { name: "Ficha del empleado", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Editar ficha", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Actualizar salario" }),
  ).toHaveCount(0);
  await page.goto(`/employees/${record.id}/edit`);
  await expect(page).toHaveURL(/\/employees$/);
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Dashboard de empleados" }),
  ).toBeVisible();
  await expect(
    page.getByRole("article", { name: "Empleados registrados", exact: true }),
  ).toContainText("1");
  await page.getByRole("button", { name: "Tabla", exact: true }).click();
  await page.route("**/api/v1/employees?*", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: '{"detail":"Token expirado"}',
    }),
  );
  await page.getByLabel("Buscar por nombre").fill("Carlos");
  await page.getByRole("button", { name: "Filtrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Tu equipo, más cerca." }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("Tu sesión terminó");
  expect(
    await page.evaluate(() => sessionStorage.getItem("pdge.session")),
  ).toBeNull();
  await request.delete(`http://127.0.0.1:8001/api/v1/employees/${record.id}`, {
    headers: record.headers,
  });
});

test("paginación, ficha inexistente y navegación móvil", async ({
  page,
  request,
}) => {
  const records = [];
  for (let i = 0; i < 11; i++)
    records.push(
      await seed(
        request,
        `40000000001${String(i).padStart(2, "0")}`,
        `Integrante ${String(i).padStart(2, "0")}`,
      ),
    );
  await login(page);
  await expect(page.getByRole("table").getByRole("row")).toHaveCount(11);
  await expect(
    page.getByRole("banner").getByText("e2e-admin", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("banner").getByRole("button", { name: "Cerrar sesión" }),
  ).toBeVisible();
  await page.getByText("4000000000100", { exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/employees/${records[0]!.id}$`));
  await page.goto("/employees");
  await page
    .getByRole("row", {
      name: "Abrir ficha de Integrante 00 Morales",
      exact: true,
    })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/employees/${records[0]!.id}$`));
  await page.goto("/employees");
  await page.getByLabel("Buscar por nombre").fill("Integrante 00");
  await page.getByRole("button", { name: "Filtrar", exact: true }).click();
  await expect(page.getByRole("table").getByRole("row")).toHaveCount(2);
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await expect(
    page.getByRole("article", { name: "Empleados registrados", exact: true }),
  ).toContainText("11");
  await expect(page.getByRole("table")).toContainText("93,500.00");
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/dashboard-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Tabla", exact: true }).click();
  await expect(page.getByLabel("Buscar por nombre")).toHaveValue(
    "Integrante 00",
  );
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await page.screenshot({
    path: "test-results/directory-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Página siguiente" }).click();
  await expect(page.getByRole("table").getByRole("row")).toHaveCount(2);
  await page.getByLabel("Empleados por página").selectOption("20");
  await expect(page.getByRole("table").getByRole("row")).toHaveCount(12);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/directory-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await expect(
    page.getByRole("button", { name: "Cerrar sesión" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Empleados", exact: true }).click();
  await page.goto("/employees/00000000-0000-0000-0000-000000000000");
  await expect(page.getByRole("alert")).toContainText(
    "No encontramos este empleado",
  );
  for (const record of records)
    await request.delete(
      `http://127.0.0.1:8001/api/v1/employees/${record.id}`,
      { headers: record.headers },
    );
});
