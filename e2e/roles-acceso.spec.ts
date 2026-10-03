import { expect, test } from "@playwright/test";

// Sin sesión, las áreas por rol redirigen a /login (la autorización fina se hace en servidor).
for (const ruta of [
  "/dashboard",
  "/dashboard/admin",
  "/dashboard/admin/colegios",
  "/dashboard/admin/tickets",
  "/dashboard/educador",
  "/dashboard/educador/ia",
]) {
  test(`sin sesión, ${ruta} redirige a /login`, async ({ page }) => {
    await page.goto(ruta);
    await expect(page).toHaveURL(/\/login/);
  });
}
