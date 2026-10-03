import { describe, expect, it } from "vitest";
import {
  AVATARES,
  calcularEdadPerfil,
  debeNotificarAcudiente,
  esAvatarValido,
  validarNombrePerfil, resolverAvatar, rutaImagenAvatar } from "./perfil";

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

describe("resolverAvatar", () => {
  it("devuelve el avatar guardado cuando es válido", () => {
    expect(resolverAvatar("avatar_05").id).toBe("avatar_05");
  });
  it("cae en avatar_01 si el id es inválido, vacío o nulo", () => {
    expect(resolverAvatar("avatar_99").id).toBe("avatar_01");
    expect(resolverAvatar("").id).toBe("avatar_01");
    expect(resolverAvatar(null).id).toBe("avatar_01");
    expect(resolverAvatar(undefined).id).toBe("avatar_01");
  });
  it("arma la ruta de la imagen solo con ids válidos", () => {
    expect(rutaImagenAvatar("avatar_03")).toBe("/avatares/avatar_03.png");
    expect(rutaImagenAvatar("../../etc/passwd")).toBe("/avatares/avatar_01.png");
  });
});
