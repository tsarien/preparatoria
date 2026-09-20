import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calcularMesesParaMeta,
  calcularProgresoPorcentaje,
  metaAlcanzada,
  validarAporte,
  aportarAMeta,
} from "./ahorro";

describe("calcularMesesParaMeta", () => {
  it("calcula meses redondeando hacia arriba", () => {
    // faltan 1.000.000, aportando 300.000/mes -> 4 meses (3.33 redondeado hacia arriba)
    expect(calcularMesesParaMeta(1_000_000, 0, 300_000)).toBe(4);
  });

  it("da 0 si la meta ya está alcanzada", () => {
    expect(calcularMesesParaMeta(1_000_000, 1_000_000, 100_000)).toBe(0);
  });

  it("da 0 si ya se pasó de la meta", () => {
    expect(calcularMesesParaMeta(1_000_000, 1_200_000, 100_000)).toBe(0);
  });

  it("da null si el aporte mensual es cero (nunca se alcanza)", () => {
    expect(calcularMesesParaMeta(1_000_000, 0, 0)).toBeNull();
  });

  it("da null si el aporte mensual es negativo", () => {
    expect(calcularMesesParaMeta(1_000_000, 0, -50_000)).toBeNull();
  });
});

describe("calcularProgresoPorcentaje", () => {
  it("calcula el porcentaje correctamente", () => {
    expect(calcularProgresoPorcentaje(250_000, 1_000_000)).toBe(25);
  });

  it("no pasa de 100 aunque el actual supere el objetivo", () => {
    expect(calcularProgresoPorcentaje(1_500_000, 1_000_000)).toBe(100);
  });

  it("da 0 si el objetivo es cero o inválido", () => {
    expect(calcularProgresoPorcentaje(100_000, 0)).toBe(0);
  });
});

describe("metaAlcanzada", () => {
  it("es true cuando el actual iguala o supera el objetivo", () => {
    expect(metaAlcanzada(1_000_000, 1_000_000)).toBe(true);
    expect(metaAlcanzada(1_200_000, 1_000_000)).toBe(true);
  });

  it("es false cuando falta plata", () => {
    expect(metaAlcanzada(500_000, 1_000_000)).toBe(false);
  });
});

describe("validarAporte", () => {
  it("acepta un aporte menor o igual al saldo disponible", () => {
    expect(validarAporte(50_000, 100_000)).toBe(true);
    expect(validarAporte(100_000, 100_000)).toBe(true);
  });

  it("rechaza un aporte mayor al saldo disponible", () => {
    expect(validarAporte(150_000, 100_000)).toBe(false);
  });

  it("rechaza montos no positivos", () => {
    expect(validarAporte(0, 100_000)).toBe(false);
    expect(validarAporte(-10_000, 100_000)).toBe(false);
  });
});

function crearSupabaseFalso(respuesta: { data?: unknown; error?: { message: string } | null }) {
  return { rpc: vi.fn().mockResolvedValue(respuesta) } as unknown as SupabaseClient;
}

describe("aportarAMeta", () => {
  it("no llama a la base de datos si el monto es inválido", async () => {
    const supabase = crearSupabaseFalso({ data: null, error: null });
    const resultado = await aportarAMeta(supabase, "m1", -5);
    expect(resultado.success).toBe(false);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("llama a aportar_a_meta con los parámetros correctos", async () => {
    const metaActualizada = { id: "m1", monto_actual: 150_000 };
    const supabase = crearSupabaseFalso({ data: metaActualizada, error: null });
    const resultado = await aportarAMeta(supabase, "m1", 50_000);
    expect(supabase.rpc).toHaveBeenCalledWith("aportar_a_meta", { p_meta_id: "m1", p_monto: 50_000 });
    expect(resultado).toEqual({ success: true, meta: metaActualizada });
  });

  it("propaga el error de la base de datos (ej. saldo insuficiente)", async () => {
    const supabase = crearSupabaseFalso({ data: null, error: { message: "saldo insuficiente" } });
    const resultado = await aportarAMeta(supabase, "m1", 999_999);
    expect(resultado).toEqual({ success: false, error: "saldo insuficiente" });
  });
});
