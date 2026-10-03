import { describe, expect, it } from "vitest";
import {
  estadoInvitacion,
  expiraEn,
  limpiarBusqueda,
  paginaSegura,
  parsearListaCursos,
  validarColegio,
  validarInvitacion,
} from "./admin";
import { generarCodigoInvitacion, hashCodigoInvitacion } from "./educadores";

describe("colegios", () => {
  it("valida nombre, ciudad y código institucional", () => {
    expect(validarColegio({ nombre: "Co", ciudad: "", codigo: "" })).toMatch(/nombre/);
    expect(validarColegio({ nombre: "Colegio Central", ciudad: "Bogotá", codigo: "COL 1" })).toMatch(/código/);
    expect(validarColegio({ nombre: "Colegio Central", ciudad: "Bogotá", codigo: "COL-001" })).toBeNull();
  });
});

describe("cursos por colegio", () => {
  it("separa por coma, punto y coma o salto de línea y quita duplicados", () => {
    expect(parsearListaCursos("10-A, 10-B\n11-A; 10-a").cursos).toEqual(["10-A", "10-B", "11-A"]);
  });
  it("rechaza vacío, caracteres raros y nombres largos", () => {
    expect(parsearListaCursos("  ,, ").error).toMatch(/al menos/);
    expect(parsearListaCursos("<script>").error).toMatch(/no permitidos/);
    expect(parsearListaCursos("x".repeat(31)).error).toMatch(/30/);
  });
});

describe("invitaciones", () => {
  it("genera códigos aleatorios con formato legible y sin caracteres ambiguos", () => {
    const codigos = new Set(Array.from({ length: 200 }, generarCodigoInvitacion));
    expect(codigos.size).toBe(200);
    for (const codigo of codigos) expect(codigo).toMatch(/^[A-HJKMNP-Z2-9]{4}(-[A-HJKMNP-Z2-9]{4}){2}$/);
  });
  it("el hash ignora mayúsculas y espacios, y nunca devuelve el código en claro", () => {
    const codigo = generarCodigoInvitacion();
    expect(hashCodigoInvitacion(codigo.toLowerCase())).toBe(hashCodigoInvitacion(` ${codigo} `));
    expect(hashCodigoInvitacion(codigo)).not.toContain(codigo);
  });
  it("valida correo y vigencia", () => {
    expect(validarInvitacion("no-correo", 7)).toMatch(/correo/);
    expect(validarInvitacion("doc@colegio.edu.co", 5)).toMatch(/vigencia/);
    expect(validarInvitacion("doc@colegio.edu.co", 7)).toBeNull();
  });
  it("calcula el estado: usada > revocada > vencida > vigente", () => {
    const ahora = new Date("2026-10-01T12:00:00Z");
    const futuro = "2026-10-05T00:00:00Z";
    const pasado = "2026-09-20T00:00:00Z";
    expect(estadoInvitacion({ usada_en: "2026-09-30T00:00:00Z", revocada_en: null, expira_en: futuro }, ahora)).toBe("usada");
    expect(estadoInvitacion({ usada_en: null, revocada_en: "2026-09-30T00:00:00Z", expira_en: futuro }, ahora)).toBe("revocada");
    expect(estadoInvitacion({ usada_en: null, revocada_en: null, expira_en: pasado }, ahora)).toBe("vencida");
    expect(estadoInvitacion({ usada_en: null, revocada_en: null, expira_en: futuro }, ahora)).toBe("vigente");
    expect(expiraEn(7, ahora)).toBe("2026-10-08T12:00:00.000Z");
  });
});

describe("búsqueda y paginación", () => {
  it("limpia comodines y separadores de filtros", () => {
    expect(limpiarBusqueda("ana%,(x)_*")).toBe("ana x");
    expect(limpiarBusqueda(undefined)).toBe("");
  });
  it("normaliza la página", () => {
    expect(paginaSegura("3")).toBe(3);
    expect(paginaSegura("-1")).toBe(1);
    expect(paginaSegura("abc")).toBe(1);
    expect(paginaSegura(undefined)).toBe(1);
  });
});
