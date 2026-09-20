import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { esEventoPositivo, puedeIgnorarse, resolverEvento } from "./eventos";

describe("esEventoPositivo", () => {
  it("un bono inesperado es positivo", () => {
    expect(esEventoPositivo("bono_inesperado")).toBe(true);
  });

  it("una factura, un imprevisto médico y una oferta sospechosa no lo son", () => {
    expect(esEventoPositivo("factura_inesperada")).toBe(false);
    expect(esEventoPositivo("imprevisto_medico")).toBe(false);
    expect(esEventoPositivo("oferta_sospechosa")).toBe(false);
  });
});

describe("puedeIgnorarse", () => {
  it("solo la oferta sospechosa se puede ignorar", () => {
    expect(puedeIgnorarse("oferta_sospechosa")).toBe(true);
  });

  it("los imprevistos reales no se pueden ignorar", () => {
    expect(puedeIgnorarse("factura_inesperada")).toBe(false);
    expect(puedeIgnorarse("imprevisto_medico")).toBe(false);
    expect(puedeIgnorarse("bono_inesperado")).toBe(false);
  });
});

function crearSupabaseFalso(respuesta: { data?: unknown; error?: { message: string } | null }) {
  return { rpc: vi.fn().mockResolvedValue(respuesta) } as unknown as SupabaseClient;
}

describe("resolverEvento", () => {
  it("llama a resolver_evento con la acción indicada", async () => {
    const eventoResuelto = { id: "e1", estado: "resuelto" };
    const supabase = crearSupabaseFalso({ data: eventoResuelto, error: null });
    const resultado = await resolverEvento(supabase, "e1", "atender");
    expect(supabase.rpc).toHaveBeenCalledWith("resolver_evento", { p_evento_id: "e1", p_accion: "atender" });
    expect(resultado).toEqual({ success: true, evento: eventoResuelto });
  });

  it("propaga errores (ej. evento ya resuelto)", async () => {
    const supabase = crearSupabaseFalso({ data: null, error: { message: "este evento ya fue resuelto" } });
    const resultado = await resolverEvento(supabase, "e1", "atender");
    expect(resultado).toEqual({ success: false, error: "este evento ya fue resuelto" });
  });
});
