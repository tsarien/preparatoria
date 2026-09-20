import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calcularDelta,
  validarSaldoSuficiente,
  registrarTransaccion,
  otorgarXp,
} from "./wallet";

describe("calcularDelta", () => {
  it("un ingreso suma al saldo", () => {
    expect(calcularDelta("ingreso", 50000)).toBe(50000);
  });

  it("un gasto resta del saldo", () => {
    expect(calcularDelta("gasto", 20000)).toBe(-20000);
  });

  it("rechaza monto cero", () => {
    expect(() => calcularDelta("ingreso", 0)).toThrow();
  });

  it("rechaza monto negativo", () => {
    expect(() => calcularDelta("gasto", -100)).toThrow();
  });
});

describe("validarSaldoSuficiente", () => {
  it("un ingreso siempre es válido, sin importar el saldo", () => {
    expect(validarSaldoSuficiente(0, "ingreso", 1_000_000)).toBe(true);
  });

  it("un gasto igual al saldo deja el saldo en cero (válido)", () => {
    expect(validarSaldoSuficiente(50000, "gasto", 50000)).toBe(true);
  });

  it("un gasto mayor al saldo no es válido", () => {
    expect(validarSaldoSuficiente(30000, "gasto", 30001)).toBe(false);
  });
});

/** Cliente de Supabase falso: solo implementa `.rpc()`, que es lo único que usa lib/wallet.ts. */
function crearSupabaseFalso(respuesta: { data?: unknown; error?: { message: string } | null }) {
  return { rpc: vi.fn().mockResolvedValue(respuesta) } as unknown as SupabaseClient;
}

describe("registrarTransaccion", () => {
  it("no llama a la base de datos si el monto es inválido", async () => {
    const supabase = crearSupabaseFalso({ data: null, error: null });

    const resultado = await registrarTransaccion(supabase, {
      personajeId: "p1",
      tipo: "gasto",
      monto: -10,
    });

    expect(resultado.success).toBe(false);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("llama a registrar_transaccion con los parámetros correctos", async () => {
    const personajeActualizado = { id: "p1", saldo_billetera: 80000 };
    const supabase = crearSupabaseFalso({ data: personajeActualizado, error: null });

    const resultado = await registrarTransaccion(supabase, {
      personajeId: "p1",
      tipo: "gasto",
      monto: 20000,
      categoria: "transporte",
    });

    expect(supabase.rpc).toHaveBeenCalledWith(
      "registrar_transaccion",
      expect.objectContaining({ p_personaje_id: "p1", p_tipo: "gasto", p_monto: 20000 })
    );
    expect(resultado).toEqual({ success: true, personaje: personajeActualizado });
  });

  it("propaga el error de la base de datos (ej. saldo insuficiente)", async () => {
    const supabase = crearSupabaseFalso({ data: null, error: { message: "saldo insuficiente" } });

    const resultado = await registrarTransaccion(supabase, {
      personajeId: "p1",
      tipo: "gasto",
      monto: 999_999,
    });

    expect(resultado).toEqual({ success: false, error: "saldo insuficiente" });
  });
});

describe("otorgarXp", () => {
  it("rechaza cantidades no positivas sin llamar a la base de datos", async () => {
    const supabase = crearSupabaseFalso({ data: null, error: null });
    const resultado = await otorgarXp(supabase, "p1", 0);
    expect(resultado.success).toBe(false);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("llama a otorgar_xp con la cantidad indicada", async () => {
    const supabase = crearSupabaseFalso({ data: { id: "p1", xp: 550, nivel: 2 }, error: null });
    const resultado = await otorgarXp(supabase, "p1", 50);
    expect(supabase.rpc).toHaveBeenCalledWith("otorgar_xp", { p_personaje_id: "p1", p_cantidad: 50 });
    expect(resultado.success).toBe(true);
  });
});
