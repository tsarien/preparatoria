import type { SupabaseClient } from "@supabase/supabase-js";
import type { MetaAhorro } from "@/types/database";

/**
 * Meses necesarios para alcanzar la meta al ritmo de aporte planeado.
 * `null` significa "nunca" (el aporte mensual es 0 o negativo).
 * `0` significa que la meta ya está alcanzada.
 */
export function calcularMesesParaMeta(
  montoObjetivo: number,
  montoActual: number,
  aporteMensual: number
): number | null {
  const faltante = montoObjetivo - montoActual;
  if (faltante <= 0) return 0;
  if (aporteMensual <= 0) return null;
  return Math.ceil(faltante / aporteMensual);
}

/** Progreso hacia la meta, como porcentaje entre 0 y 100. */
export function calcularProgresoPorcentaje(montoActual: number, montoObjetivo: number): number {
  if (montoObjetivo <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((montoActual / montoObjetivo) * 100)));
}

export function metaAlcanzada(montoActual: number, montoObjetivo: number): boolean {
  return montoActual >= montoObjetivo;
}

/** Un aporte tiene que ser positivo y no puede superar lo que hay disponible en la billetera. */
export function validarAporte(monto: number, saldoDisponible: number): boolean {
  return monto > 0 && monto <= saldoDisponible;
}

export type ResultadoAporte = { success: true; meta: MetaAhorro } | { success: false; error: string };

/**
 * Mueve plata del saldo hacia la meta, llamando a la función atómica `aportar_a_meta`
 * en Postgres (supabase/migrations/0007_modulo_ahorro.sql), que a su vez reutiliza
 * registrar_transaccion — el saldo nunca se calcula en el cliente.
 */
export async function aportarAMeta(
  supabase: SupabaseClient,
  metaId: string,
  monto: number
): Promise<ResultadoAporte> {
  if (!Number.isFinite(monto) || monto <= 0) {
    return { success: false, error: "El aporte debe ser mayor a cero" };
  }

  const { data, error } = await supabase.rpc("aportar_a_meta", { p_meta_id: metaId, p_monto: monto });
  if (error) return { success: false, error: error.message };
  return { success: true, meta: data as MetaAhorro };
}
