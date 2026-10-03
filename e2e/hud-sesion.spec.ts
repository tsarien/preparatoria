import { expect, test, type Page } from "@playwright/test";

// Requiere un estudiante de prueba real (npm run seed:test-users o el que prefieras):
//   E2E_ESTUDIANTE_EMAIL, E2E_ESTUDIANTE_PASSWORD  en .env.local
const correo = process.env.E2E_ESTUDIANTE_EMAIL;
const clave = process.env.E2E_ESTUDIANTE_PASSWORD;
test.skip(!correo || !clave, "Define E2E_ESTUDIANTE_EMAIL y E2E_ESTUDIANTE_PASSWORD para probar con sesión.");

async function entrar(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(correo!);
  await page.getByLabel("Contraseña").fill(clave!);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/dashboard");
}

for (const ancho of [320, 375, 390, 768, 1280]) {
  test(`HUD a ${ancho}px: el nombre es horizontal y la billetera/salir están en el banner`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 800 });
    await entrar(page);

    const hud = page.getByTestId("game-hud");
    const nombre = page.getByTestId("hud-nombre");
    const caja = await nombre.boundingBox();
    expect(caja, "el nombre debe estar visible").not.toBeNull();
    // Texto vertical (una letra por línea) daría un ancho minúsculo y un alto enorme.
    expect(caja!.width).toBeGreaterThanOrEqual(90);
    expect(caja!.height).toBeLessThanOrEqual(90);

    await expect(hud.getByRole("link", { name: "Ver billetera completa" })).toBeVisible();
    await expect(hud.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
    // El botón inferior duplicado ya no existe.
    await expect(page.getByRole("link", { name: "Ver billetera completa" })).toHaveCount(1);

    const sinDesborde = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    );
    expect(sinDesborde).toBe(true);
  });
}

test("el botón de IA Guía abre el chat sin navegar", async ({ page }) => {
  await entrar(page);
  const url = page.url();
  await page.getByRole("button", { name: "Abrir IA Guía" }).click();
  await expect(page.getByRole("dialog", { name: "Chat de la IA Guía" })).toBeVisible();
  expect(page.url()).toBe(url);
  await page.getByRole("button", { name: "Cerrar chat" }).click();
  await expect(page.getByRole("dialog", { name: "Chat de la IA Guía" })).toBeHidden();
});

test("las misiones siguen el orden oficial", async ({ page }) => {
  await entrar(page);
  const esperadas: [string, string][] = [
    ["presupuesto-personal", "Misión 01"],
    ["ahorro-metas", "Misión 02"],
    ["primer-empleo", "Misión 03"],
    ["detectar-estafas", "Misión 04"],
    ["contrato-arriendo", "Misión 05"],
  ];
  for (const [slug, etiqueta] of esperadas) {
    await page.goto(`/dashboard/modulos/${slug}`);
    await expect(page.getByText(etiqueta, { exact: false }).first()).toBeVisible();
  }
  await page.goto("/dashboard/modulos/primer-empleo");
  await expect(page.getByRole("link", { name: /Volver al mapa/ })).toBeVisible();
});
