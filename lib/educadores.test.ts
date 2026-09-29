import { describe, expect, it } from "vitest";
import {
  esCargoEducativo,
  hashCodigoInvitacion,
  normalizarCursosEducativos,
  resolverRolDesdeAppMetadata,
} from "./educadores";

describe("registro educativo y roles", () => {
  it("admite estudiante y educador, pero nunca privilegios públicos", () => {
    expect(resolverRolDesdeAppMetadata("educador")).toBe("educador");
    expect(resolverRolDesdeAppMetadata("estudiante")).toBe("estudiante");
    expect(resolverRolDesdeAppMetadata("administrador")).toBe("estudiante");
    expect(resolverRolDesdeAppMetadata("superadmin")).toBe("estudiante");
  });

  it("acepta solo cargos educativos predefinidos", () => {
    expect(esCargoEducativo("Docente")).toBe(true);
    expect(esCargoEducativo("administrador")).toBe(false);
  });

  it("normaliza cursos, elimina duplicados y limita la cantidad", () => {
    expect(normalizarCursosEducativos("10-A, 11-B; 10-A")).toEqual([
      "10-A",
      "11-B",
    ]);
    expect(
      normalizarCursosEducativos(
        Array.from({ length: 12 }, (_, i) => `G${i}`).join(","),
      ),
    ).toHaveLength(10);
  });

  it("almacena el hash de la invitación, no el código en claro", () => {
    const hash = hashCodigoInvitacion(" A1B2 ");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toBe("a1b2");
  });
});
