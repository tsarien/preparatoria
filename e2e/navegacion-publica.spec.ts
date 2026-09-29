import { test, expect } from "@playwright/test";

/**
 * Estas pruebas NO necesitan Supabase ni la API de Claude configurados — corren
 * contra el estado "sin conectar" que la app maneja explícitamente en cada fase
 * (ver los `isSupabaseConfigured` / `isAiConfigured` en lib/). Por eso son las
 * únicas que pude verificar de punta a punta sin credenciales reales.
 */

test.describe("Páginas públicas", () => {
  test("la landing muestra el nombre del producto y los botones de entrada", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Crear cuenta" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Ya tengo cuenta" }),
    ).toBeVisible();
  });

  test("/login muestra el formulario de inicio de sesión", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("Correo")).toBeVisible();
    await expect(page.getByLabel("Contraseña")).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
    await expect(page.getByRole("link", { name: "IA Guía" })).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Regístrate como educador" }),
    ).toBeVisible();
  });

  test("/registro muestra el formulario de registro", async ({ page }) => {
    await page.goto("/registro");
    await expect(page.getByLabel("Nombre completo")).toBeVisible();
    await expect(page.getByLabel("Fecha de nacimiento")).toBeVisible();
    await expect(page.getByLabel("Colegio")).toBeVisible();
    await expect(page.getByLabel("Colegio")).toHaveJSProperty(
      "tagName",
      "SELECT",
    );
    await expect(
      page.getByRole("option", { name: "Selecciona tu colegio" }),
    ).toHaveAttribute("disabled", "");
    await expect(
      page.getByText(
        "¿No encuentras tu colegio? Solicita a tu institución que se comunique con preparatorIA.",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Crear cuenta educativa" }),
    ).toBeVisible();
  });

  test("/registro/educador muestra un formulario independiente y roles no privilegiados", async ({
    page,
  }) => {
    await page.goto("/registro/educador");
    await expect(
      page.getByRole("heading", { name: "Registro educativo" }),
    ).toBeVisible();
    await expect(page.getByLabel("Correo institucional")).toBeVisible();
    await expect(page.getByLabel("Colegio / institución")).toHaveJSProperty(
      "tagName",
      "SELECT",
    );
    await expect(page.getByLabel("Cargo")).toBeVisible();
    await expect(
      page.getByRole("option", { name: /administrador|superadmin/i }),
    ).toHaveCount(0);
  });

  test("el paisaje sigue visible en claro, oscuro y sistema", async ({
    page,
  }) => {
    const escenarios = [
      { tema: "claro", sistema: "light", oscuro: false },
      { tema: "oscuro", sistema: "light", oscuro: true },
      { tema: "sistema", sistema: "dark", oscuro: true },
    ] as const;

    for (const escenario of escenarios) {
      await page.emulateMedia({ colorScheme: escenario.sistema });
      await page.goto("/login");
      await page.evaluate((tema) => {
        localStorage.setItem("preparatoria-tema", tema);
      }, escenario.tema);
      await page.reload();

      const estaOscuro = await page
        .locator("html")
        .evaluate((elemento) => elemento.classList.contains("dark"));
      expect(estaOscuro).toBe(escenario.oscuro);

      const paisaje = page.getByTestId("paisaje-fondo");
      await expect(paisaje).toBeVisible();
      await expect
        .poll(() =>
          paisaje
            .locator(":scope > div")
            .evaluate((elemento) => getComputedStyle(elemento).backgroundImage),
        )
        .not.toBe("none");
      await expect(paisaje.locator(":scope > div")).toHaveCount(1);
    }
  });

  test("el formulario de registro pide el correo del acudiente si eres menor de edad", async ({
    page,
  }) => {
    await page.goto("/registro");
    await expect(page.locator('form[data-hidratado="true"]')).toBeVisible();
    const hoy = new Date();
    const hace15Anos = new Date(
      hoy.getFullYear() - 15,
      hoy.getMonth(),
      hoy.getDate(),
    );
    await page
      .getByLabel("Fecha de nacimiento")
      .fill(hace15Anos.toISOString().slice(0, 10));
    await expect(page.getByLabel("Correo de tu acudiente")).toBeVisible();
  });

  test("/privacidad carga la política de privacidad", async ({ page }) => {
    await page.goto("/privacidad");
    await expect(
      page.getByRole("heading", { name: "Política de privacidad" }),
    ).toBeVisible();
  });
});

test.describe("Rutas protegidas redirigen a /login sin sesión", () => {
  const rutasProtegidas = [
    "/dashboard",
    "/dashboard/billetera",
    "/dashboard/eventos",
    "/dashboard/ranking",
    "/dashboard/modulos/presupuesto-personal",
    "/dashboard/modulos/primer-empleo",
    "/dashboard/modulos/primer-empleo/hoja-de-vida",
    "/dashboard/educador",
    "/dashboard/educador/estudiantes",
    "/dashboard/educador/reportes",
    "/dashboard/educador/ia",
    "/dashboard/modulos/detectar-estafas",
    "/dashboard/modulos/contrato-arriendo",
    "/dashboard/modulos/ahorro-metas",
  ];

  for (const ruta of rutasProtegidas) {
    test(`${ruta} redirige a /login`, async ({ page }) => {
      await page.goto(ruta);
      await expect(page).toHaveURL(/\/login/);
    });
  }
});
