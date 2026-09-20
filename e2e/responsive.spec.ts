import { test, expect, devices } from "@playwright/test";

/**
 * Chequeo automático de responsividad: en un viewport angosto (320px, el
 * iPhone SE — el más estrecho de uso común), la página nunca debería generar
 * scroll horizontal. Es una señal barata y confiable de que algo se desbordó
 * (una grilla de columnas fijas, un texto muy largo sin wrap, etc.).
 */
test.use({ ...devices["iPhone SE"] });

const paginasPublicas = ["/", "/login", "/registro", "/privacidad"];

for (const ruta of paginasPublicas) {
  test(`${ruta} no tiene scroll horizontal en 320px de ancho`, async ({ page }) => {
    await page.goto(ruta);
    const [scrollWidth, clientWidth] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ]);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
}

test("el selector de tema en /dashboard/ajustes no se ve apretado en celular", async ({ page }) => {
  // Esta redirige a /login sin sesión — igual sirve para confirmar que la
  // propia redirección no genera desbordamiento en un viewport angosto.
  await page.goto("/dashboard/ajustes");
  const [scrollWidth, clientWidth] = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    document.documentElement.clientWidth,
  ]);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});
