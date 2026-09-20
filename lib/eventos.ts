import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventoAleatorio } from "@/types/database";

export type TipoEvento = EventoAleatorio["tipo"];

/** Los únicos eventos que suman plata en vez de restarla. */
export function esEventoPositivo(tipo: TipoEvento): boolean {
  return tipo === "bono_inesperado";
}

/**
 * Solo la "oferta sospechosa" tiene sentido ignorar — es la decisión correcta,
 * igual que en el módulo de detectar estafas. Un imprevisto real no se puede
 * simplemente ignorar.
 */
export function puedeIgnorarse(tipo: TipoEvento): boolean {
  return tipo === "oferta_sospechosa";
}

export type ResultadoEvento =
  | { success: true; evento: EventoAleatorio }
  | { success: false; error: string };

/** Llama a la función atómica `resolver_evento` en Postgres (Fase 7). */
export async function resolverEvento(
  supabase: SupabaseClient,
  eventoId: string,
  accion: "atender" | "ignorar"
): Promise<ResultadoEvento> {
  const { data, error } = await supabase.rpc("resolver_evento", {
    p_evento_id: eventoId,
    p_accion: accion,
  });
  if (error) return { success: false, error: error.message };
  return { success: true, evento: data as EventoAleatorio };
}
