import { describe, expect, it } from "vitest";
import { esRolPerfil, rutaInicioPorRol } from "./roles";

describe("roles de la aplicación", () => {
  it("dirige cada rol a su inicio", () => {
    expect(rutaInicioPorRol("administrador")).toBe("/dashboard/admin");
    expect(rutaInicioPorRol("educador")).toBe("/dashboard/educador");
    expect(rutaInicioPorRol("estudiante")).toBe("/dashboard");
  });
  it("ante un rol desconocido usa el inicio de estudiante (el más restringido)", () => {
    expect(rutaInicioPorRol("superadmin")).toBe("/dashboard");
    expect(rutaInicioPorRol(null)).toBe("/dashboard");
  });
  it("reconoce solo los tres roles válidos", () => {
    expect(esRolPerfil("administrador")).toBe(true);
    expect(esRolPerfil("root")).toBe(false);
    expect(esRolPerfil(undefined)).toBe(false);
  });
});
