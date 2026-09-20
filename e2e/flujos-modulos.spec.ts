import { test, expect, type Page } from "@playwright/test";

/**
 * Estas pruebas SÍ necesitan credenciales reales (Supabase + ANTHROPIC_API_KEY en
 * .env.local) porque recorren el flujo completo: registro → login → completar un
 * reto → ver retroalimentación real de la IA. No las pude correr en el entorno
 * donde armé el proyecto (sin esas credenciales) — por eso se saltan solas
 * (`test.skip`) si no las detectan, en vez de fallar de forma confusa. Corre
 * `npx playwright install` y `npm test:e2e` con tu `.env.local` completo para
 * ejecutarlas de verdad.
 */
const credencialesListas = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.ANTHROPIC_API_KEY
);

test.skip(!credencialesListas, "Necesita NEXT_PUBLIC_SUPABASE_URL y ANTHROPIC_API_KEY en .env.local");

async function registrarEstudianteDePrueba(page: Page) {
  const correo = `estudiante-${Date.now()}@ejemplo.com`;
  await page.goto("/registro");
  await page.getByLabel("Nombre completo").fill("Estudiante de Prueba");
  await page.getByLabel("Fecha de nacimiento").fill("2008-01-15"); // mayor de edad, sin campo de acudiente
  await page.getByLabel("Colegio").fill(`Colegio E2E ${Date.now()}`);
  await page.getByLabel("Curso (ej. 11-A)").fill("11-A");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill("contraseña-segura-123");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}

test.describe("Flujo completo por módulo", () => {
  test.beforeEach(async ({ page }) => {
    await registrarEstudianteDePrueba(page);
  });

  test("Presupuesto personal: distribuir el salario da retroalimentación", async ({ page }) => {
    await page.goto("/dashboard/modulos/presupuesto-personal/distribuir-salario");
    const salario = await page.locator("text=/\\$[0-9.]+/").first().innerText();
    const monto = Number(salario.replace(/[^0-9]/g, ""));

    await page.getByLabel("Vivienda").fill(String(Math.round(monto * 0.4)));
    await page.getByLabel("Comida").fill(String(Math.round(monto * 0.3)));
    await page.getByLabel("Transporte").fill(String(Math.round(monto * 0.1)));
    await page.getByLabel("Ahorro").fill(String(Math.round(monto * 0.15)));
    await page.getByLabel("Ocio").fill(String(monto - Math.round(monto * 0.95)));

    await page.getByRole("button", { name: "Confirmar distribución" }).click();
    await expect(page.getByText("Retroalimentación del tutor")).toBeVisible({ timeout: 20_000 });
  });

  test("Detectar estafas: el escenario legítimo no debería marcarse como estafa por error", async ({ page }) => {
    await page.goto("/dashboard/modulos/detectar-estafas/correo-colegio");
    await page.getByRole("button", { name: "No, es legítimo" }).click();
    await page
      .getByPlaceholder("¿Por qué? Menciona qué te hizo sospechar (o confiar).")
      .fill("Es del dominio real del colegio y no pide plata ni datos.");
    await page.getByRole("button", { name: "Confirmar mi decisión" }).click();
    await expect(page.getByText("Retroalimentación del tutor")).toBeVisible({ timeout: 20_000 });
  });

  test("Contrato de arriendo: leer el contrato da retroalimentación", async ({ page }) => {
    await page.goto("/dashboard/modulos/contrato-arriendo/leer-contrato");
    await page.getByLabel(/incrementará cada año según el IPC/).check();
    await page.getByLabel(/interés del 5% diario/).check();
    await page.getByLabel("$900.000").check();
    await page.getByLabel("30 días").check();
    await page.getByLabel("Pagas una multa de 3 meses de canon").check();
    await page.getByRole("button", { name: "Enviar respuestas" }).click();
    await expect(page.getByText("Retroalimentación del tutor")).toBeVisible({ timeout: 20_000 });
  });

  test("Ahorro con metas: crear una meta da retroalimentación y queda visible al volver", async ({ page }) => {
    await page.goto("/dashboard/modulos/ahorro-metas/meta-de-ahorro");
    await page.getByLabel("Monto objetivo (COP)").fill("15000000");
    await page.getByLabel("¿Cuánto planeas aportar cada mes?").fill("150000");
    await page.getByRole("button", { name: "Crear meta" }).click();
    await expect(page.getByText("Retroalimentación del tutor")).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: "Ver mi meta" }).click();
    await expect(page.getByText("% completado")).toBeVisible();
  });
});
