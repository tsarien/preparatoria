import { describe, it, expect } from "vitest";
import { minutosDelDiaColombia, momentoDelDia, momentoActualColombia } from "./paisaje";

describe("minutosDelDiaColombia", () => {
  it("convierte de UTC a minutos del día en Bogotá (UTC-5)", () => {
    expect(minutosDelDiaColombia(new Date("2026-01-15T17:00:00Z"))).toBe(12 * 60); // mediodía exacto
    expect(minutosDelDiaColombia(new Date("2026-01-15T17:30:00Z"))).toBe(12 * 60 + 30); // 12:30
  });

  it("no depende del mes (Colombia no tiene horario de verano)", () => {
    expect(minutosDelDiaColombia(new Date("2026-01-15T15:00:00Z"))).toBe(10 * 60);
    expect(minutosDelDiaColombia(new Date("2026-07-15T15:00:00Z"))).toBe(10 * 60);
  });

  it("maneja la medianoche correctamente", () => {
    expect(minutosDelDiaColombia(new Date("2026-01-15T05:00:00Z"))).toBe(0);
  });
});

describe("momentoDelDia", () => {
  it("clasifica el amanecer (4:30-6:59)", () => {
    expect(momentoDelDia(4 * 60 + 30)).toBe("amanecer"); // 4:30 exacto, límite inferior
    expect(momentoDelDia(4 * 60 + 29)).toBe("noche"); // un minuto antes, todavía noche
    expect(momentoDelDia(6 * 60 + 59)).toBe("amanecer"); // último minuto de amanecer
  });

  it("clasifica la mañana (7:00-10:59)", () => {
    expect(momentoDelDia(7 * 60)).toBe("manana");
    expect(momentoDelDia(10 * 60 + 59)).toBe("manana");
  });

  it("clasifica el mediodía (11:00-15:59)", () => {
    expect(momentoDelDia(11 * 60)).toBe("mediodia");
    expect(momentoDelDia(15 * 60 + 59)).toBe("mediodia");
  });

  it("clasifica el atardecer (16:00-18:59)", () => {
    expect(momentoDelDia(16 * 60)).toBe("atardecer");
    expect(momentoDelDia(18 * 60 + 59)).toBe("atardecer");
  });

  it("clasifica la noche (19:00-4:29, envolviendo la medianoche)", () => {
    expect(momentoDelDia(19 * 60)).toBe("noche"); // 19:00 exacto
    expect(momentoDelDia(23 * 60 + 59)).toBe("noche"); // 23:59
    expect(momentoDelDia(0)).toBe("noche"); // medianoche
    expect(momentoDelDia(4 * 60 + 29)).toBe("noche"); // último minuto antes del amanecer
  });

  it("cubre las 1440 franjas de un día sin huecos", () => {
    const validos = ["amanecer", "manana", "mediodia", "atardecer", "noche"];
    for (let m = 0; m < 1440; m += 7) {
      expect(validos).toContain(momentoDelDia(m));
    }
  });

  it("rechaza valores inválidos", () => {
    expect(() => momentoDelDia(1440)).toThrow();
    expect(() => momentoDelDia(-1)).toThrow();
    expect(() => momentoDelDia(30.5)).toThrow();
  });
});

describe("momentoActualColombia", () => {
  it("combina las dos funciones anteriores", () => {
    expect(momentoActualColombia(new Date("2026-01-15T17:00:00Z"))).toBe("mediodia"); // 12pm Bogotá
    expect(momentoActualColombia(new Date("2026-01-15T00:00:00Z"))).toBe("noche"); // 7pm Bogotá
  });
});
