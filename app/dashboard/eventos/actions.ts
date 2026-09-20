"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolverEvento, type ResultadoEvento } from "@/lib/eventos";

export async function resolverEventoAction(
  eventoId: string,
  accion: "atender" | "ignorar"
): Promise<ResultadoEvento> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { success: false, error: "No hay conexión con Supabase." };
  return resolverEvento(supabase, eventoId, accion);
}
