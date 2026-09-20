import { describe, it, expect } from "vitest";
import {
  identificacionCorrecta,
  calcularRecompensaEstafaEvitada,
  puedeEnviarMensaje,
  MAX_MENSAJES_ESTUDIANTE,
} from "./estafas";

describe("identificacionCorrecta", () => {
  it("es correcta si dice estafa y sí lo era", () => {
    expect(identificacionCorrecta(true, true)).toBe(true);
  });

  it("es correcta si dice que no es estafa y en efecto no lo era", () => {
    expect(identificacionCorrecta(false, false)).toBe(true);
  });

  it("es incorrecta si dice estafa pero era legítimo (falsa alarma)", () => {
    expect(identificacionCorrecta(true, false)).toBe(false);
  });

  it("es incorrecta si dice que no es estafa pero sí lo era", () => {
    expect(identificacionCorrecta(false, true)).toBe(false);
  });
});

describe("calcularRecompensaEstafaEvitada", () => {
  it("otorga el monto en riesgo si detecta correctamente una estafa real", () => {
    expect(calcularRecompensaEstafaEvitada(true, true, 45000)).toBe(45000);
  });

  it("no otorga nada si no identificó la estafa", () => {
    expect(calcularRecompensaEstafaEvitada(false, true, 45000)).toBe(0);
  });

  it("no otorga nada por acertar que algo legítimo no es estafa (no había plata en riesgo)", () => {
    expect(calcularRecompensaEstafaEvitada(false, false, null)).toBe(0);
  });

  it("no otorga nada por una falsa alarma (decir estafa cuando era legítimo)", () => {
    expect(calcularRecompensaEstafaEvitada(true, false, null)).toBe(0);
  });

  it("da 0 si el escenario no tenía monto en riesgo definido", () => {
    expect(calcularRecompensaEstafaEvitada(true, true, null)).toBe(0);
  });
});

describe("puedeEnviarMensaje", () => {
  it("permite enviar mientras no se alcance el máximo", () => {
    expect(puedeEnviarMensaje(0)).toBe(true);
    expect(puedeEnviarMensaje(MAX_MENSAJES_ESTUDIANTE - 1)).toBe(true);
  });

  it("bloquea al llegar al máximo", () => {
    expect(puedeEnviarMensaje(MAX_MENSAJES_ESTUDIANTE)).toBe(false);
  });

  it("respeta un máximo personalizado", () => {
    expect(puedeEnviarMensaje(1, 1)).toBe(false);
  });
});
