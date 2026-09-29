import { test, expect } from "@playwright/test";

const paginasPublicas = [
  "/",
  "/login",
  "/registro",
  "/registro/educador",
  "/privacidad",
];
const anchos = [320, 360, 375, 390, 430, 768, 1024, 1280, 1440];

for (const ancho of anchos) {
  test(`páginas públicas responsivas a ${ancho}px`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 900 });

    for (const ruta of paginasPublicas) {
      await page.goto(ruta);
      const resultado = await page.evaluate(() => {
        const anchoViewport = document.documentElement.clientWidth;
        const controlesFueraDePantalla = Array.from(
          document.querySelectorAll<HTMLElement>(
            'a[href], button, input, textarea, select, [role="button"]',
          ),
        )
          .filter((elemento) => {
            const estilo = getComputedStyle(elemento);
            const caja = elemento.getBoundingClientRect();
            return (
              estilo.display !== "none" &&
              estilo.visibility !== "hidden" &&
              caja.width > 0 &&
              caja.height > 0 &&
              (caja.left < -1 || caja.right > anchoViewport + 1)
            );
          })
          .map(
            (elemento) =>
              elemento.innerText ||
              elemento.getAttribute("aria-label") ||
              elemento.tagName,
          );

        return {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: anchoViewport,
          controlesFueraDePantalla,
        };
      });

      expect(
        resultado.scrollWidth,
        `${ruta} genera scroll horizontal a ${ancho}px`,
      ).toBeLessThanOrEqual(resultado.clientWidth);
      expect(
        resultado.controlesFueraDePantalla,
        `${ruta} tiene controles fuera del viewport a ${ancho}px`,
      ).toEqual([]);
    }
  });
}

test("la ruta protegida de ajustes redirige sin desbordarse en mobile", async ({
  page,
}) => {
  for (const ancho of anchos.slice(0, 5)) {
    await page.setViewportSize({ width: ancho, height: 900 });
    await page.goto("/dashboard/ajustes");
    await expect(page).toHaveURL(/\/login/);
    const [scrollWidth, clientWidth] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ]);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  }
});
