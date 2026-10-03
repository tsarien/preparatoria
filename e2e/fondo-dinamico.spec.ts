import { expect, test } from "@playwright/test";

// El fondo por hora debe ser el MISMO componente (PaisajeFondo) en Home y en las páginas de auth.
const RUTAS = ["/", "/login", "/registro", "/registro/educador"];

test("Home, login, registro y registro de educador usan el mismo fondo dinámico", async ({ page }) => {
  const momentos: string[] = [];
  for (const ruta of RUTAS) {
    await page.goto(ruta);
    const fondo = page.getByTestId("paisaje-fondo");
    await expect(fondo, `${ruta} debe tener el fondo`).toHaveCount(1);
    momentos.push((await fondo.getAttribute("data-momento")) ?? "");
  }
  expect(momentos.every(Boolean)).toBe(true);
  expect(new Set(momentos).size, "todas las páginas muestran el mismo momento del día").toBe(1);
});

for (const ruta of ["/login", "/registro", "/registro/educador"]) {
  test(`${ruta}: el formulario es legible y no desborda a 320px`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(ruta);
    const sinDesborde = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    );
    expect(sinDesborde).toBe(true);
  });
}

test("registro de educador tiene el enlace de inicio de sesión", async ({ page }) => {
  await page.goto("/registro/educador");
  await expect(page.getByRole("link", { name: "Inicia sesión" })).toHaveAttribute("href", "/login");
});

test("registro pide contraseña y confirmación; el estudiante pide fecha de nacimiento", async ({ page }) => {
  await page.goto("/registro");
  await expect(page.getByLabel("Contraseña", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Confirma tu contraseña")).toBeVisible();
  await expect(page.getByLabel(/Fecha de nacimiento/)).toBeVisible();
  await page.getByLabel("Contraseña", { exact: true }).fill("clave-segura-1");
  await page.getByLabel("Confirma tu contraseña").fill("otra-clave-123");
  await expect(page.getByText("Las contraseñas no coinciden.")).toBeVisible();
});
