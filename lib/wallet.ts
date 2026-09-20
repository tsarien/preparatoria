import type { SupabaseClient } from "@supabase/supabase-js";
import type { Personaje } from "@/types/database";

export type TipoTransaccion = "ingreso" | "gasto";

export interface RegistrarTransaccionInput {
  personajeId: string;
  tipo: TipoTransaccion;
  monto: number;
  categoria?: string;
  descripcion?: string;
  origen?: string;
  /** Por defecto no se permite quedar en negativo — ver comentario en validarSaldoSuficiente. */
  permitirNegativo?: boolean;
}

export type ResultadoBilletera =
  | { success: true; personaje: Personaje }
  | { success: false; error: string };

/**
 * Ingreso suma, gasto resta. Lanza si el monto no es un número positivo.
 * Misma regla que la función SQL `registrar_transaccion` — probada aquí porque
 * es pura; la base de datos es quien la hace cumplir de verdad.
 */
export function calcularDelta(tipo: TipoTransaccion, monto: number): number {
  if (!Number.isFinite(monto) || monto <= 0) {
    throw new Error("El monto debe ser un número mayor a cero");
  }
  return tipo === "ingreso" ? monto : -monto;
}

/**
 * ¿El personaje tiene saldo suficiente para este gasto? Los ingresos siempre pasan.
 * Por defecto, el motor no deja que el saldo quede negativo (comportamiento de una
 * cuenta bancaria real) — para eventos narrativos específicos que sí deban permitirlo
 * (Fase 7), se usa el parámetro `permitirNegativo`.
 */
export function validarSaldoSuficiente(
  saldoActual: number,
  tipo: TipoTransaccion,
  monto: number
): boolean {
  if (tipo === "ingreso") return true;
  return saldoActual - monto >= 0;
}

/**
 * Registra una transacción y actualiza el saldo de forma atómica, llamando a la
 * función `registrar_transaccion` en Postgres (supabase/migrations/0003_wallet_functions.sql).
 * El cálculo del saldo NO se hace en el cliente — la base de datos es la fuente de verdad,
 * esto solo valida rápido para dar un mejor mensaje de error antes de ir a la red.
 *
 * `supabase` debe ser un cliente con la sesión del estudiante (server o browser),
 * porque la función SQL usa auth.uid() para verificar que el personaje es suyo.
 */
export async function registrarTransaccion(
  supabase: SupabaseClient,
  input: RegistrarTransaccionInput
): Promise<ResultadoBilletera> {
  try {
    calcularDelta(input.tipo, input.monto);
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Monto inválido" };
  }

  const { data, error } = await supabase.rpc("registrar_transaccion", {
    p_personaje_id: input.personajeId,
    p_tipo: input.tipo,
    p_monto: input.monto,
    p_categoria: input.categoria ?? null,
    p_descripcion: input.descripcion ?? null,
    p_origen: input.origen ?? null,
    p_permitir_negativo: input.permitirNegativo ?? false,
  });

  if (error) return { success: false, error: error.message };
  return { success: true, personaje: data as Personaje };
}

/**
 * Otorga XP y recalcula el nivel de forma atómica (función SQL `otorgar_xp`).
 * La fórmula de nivel vive en lib/gamification.ts y está espejada en SQL.
 */
export async function otorgarXp(
  supabase: SupabaseClient,
  personajeId: string,
  cantidad: number
): Promise<ResultadoBilletera> {
  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    return { success: false, error: "La cantidad de XP debe ser mayor a cero" };
  }

  const { data, error } = await supabase.rpc("otorgar_xp", {
    p_personaje_id: personajeId,
    p_cantidad: cantidad,
  });

  if (error) return { success: false, error: error.message };
  return { success: true, personaje: data as Personaje };
}
