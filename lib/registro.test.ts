import { describe, expect, it } from "vitest";
import {
  esMenorDeEdad,
  parsearFechaNacimiento,
  validarContrasena,
  validarCorreoAcudiente,
  validarFechaNacimiento,
} from "./registro";

const HOY = new Date(2026, 9, 1); // 1 oct 2026

describe("contraseña y confirmación", () => {
  it("exige mínimo 8 caracteres", () => {
    expect(validarContrasena("1234567", "1234567")).toMatch(/8 caracteres/);
  });
  it("exige confirmar y que coincidan", () => {
    expect(validarContrasena("clave-segura", "")).toBe("Confirma tu contraseña.");
    expect(validarContrasena("clave-segura", "clave-segurA")).toBe(
      "Las contraseñas no coinciden.",
    );
  });
  it("acepta contraseñas iguales de 8+ caracteres", () => {
    expect(validarContrasena("clave-segura", "clave-segura")).toBeNull();
  });
});

describe("fecha de nacimiento", () => {
  it("es obligatoria y debe ser una fecha real", () => {
    expect(validarFechaNacimiento("", HOY)).toMatch(/Indica/);
    expect(validarFechaNacimiento("no-es-fecha", HOY)).toMatch(/no es válida/);
    expect(validarFechaNacimiento("2010-02-31", HOY)).toMatch(/no es válida/);
    expect(parsearFechaNacimiento("2010-02-28")).not.toBeNull();
  });
  it("rechaza fechas futuras y edades absurdas", () => {
    expect(validarFechaNacimiento("2027-01-01", HOY)).toMatch(/futuro/);
    expect(validarFechaNacimiento("1800-01-01", HOY)).toMatch(/no es válida/);
  });
  it("detecta menores de edad en el límite exacto de los 18", () => {
    expect(esMenorDeEdad("2008-10-02", HOY)).toBe(true); // cumple 18 mañana
    expect(esMenorDeEdad("2008-10-01", HOY)).toBe(false); // cumple 18 hoy
    expect(esMenorDeEdad("", HOY)).toBe(false);
  });
});

describe("correo del acudiente", () => {
  it("es obligatorio, válido y distinto al del estudiante", () => {
    expect(validarCorreoAcudiente("", "e@x.co")).toMatch(/necesitamos/);
    expect(validarCorreoAcudiente("sin-arroba", "e@x.co")).toMatch(/válido/);
    expect(validarCorreoAcudiente("E@X.co", "e@x.co")).toMatch(/distinto/);
    expect(validarCorreoAcudiente("mama@x.co", "e@x.co")).toBeNull();
  });
});
