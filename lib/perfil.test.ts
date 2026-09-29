import { describe, expect, it } from "vitest";
import {
  AVATARES,
  calcularEdadPerfil,
  debeNotificarAcudiente,
  esAvatarValido,
  validarNombrePerfil,
} from "./perfil";

describe("perfil y avatares", () => {
  it("acepta únicamente IDs del catálogo fijo, nunca rutas arbitrarias", () => {
    expect(esAvatarValido("avatar_01")).toBe(true);
    expect(esAvatarValido("/uploads/selfie.png")).toBe(false);
    expect(esAvatarValido("https://example.com/avatar.png")).toBe(false);
    expect(AVATARES).toHaveLength(8);
  });

  it("valida nombre no vacío, longitud y caracteres razonables", () => {
    expect(validarNombrePerfil("  Ana María  ")).toBeNull();
    expect(validarNombrePerfil(" ")).not.toBeNull();
    expect(validarNombrePerfil("Ana<script>")).not.toBeNull();
  });

  it("calcula edad con la fecha local y evita editarla desde ajustes", () => {
    expect(
      calcularEdadPerfil("2010-09-28", new Date("2026-09-28T12:00:00")),
    ).toBe(16);
    expect(
      calcularEdadPerfil("2010-09-29", new Date("2026-09-28T12:00:00")),
    ).toBe(15);
  });

  it("notifica solo si la cuenta pertenece a un menor con acudiente registrado", () => {
    const hoy = new Date("2026-09-28T12:00:00");
    expect(
      debeNotificarAcudiente("2010-01-01", "acudiente@example.com", hoy),
    ).toBe(true);
    expect(
      debeNotificarAcudiente("2000-01-01", "acudiente@example.com", hoy),
    ).toBe(false);
    expect(debeNotificarAcudiente("2010-01-01", null, hoy)).toBe(false);
  });
});
