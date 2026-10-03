import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { esUuid } from "./utils";

/** Cursos activos de un colegio activo, leídos de la BD (nunca del cliente). */
export async function obtenerCursosColegio(
  supabase: SupabaseClient<Database>,
  colegioId: string,
): Promise<string[]> {
  if (!esUuid(colegioId)) return [];
  const { data } = await supabase
    .from("cursos_colegio")
    .select("nombre")
    .eq("colegio_id", colegioId)
    .eq("activo", true)
    .order("nombre");
  return (data ?? []).map((fila) => String(fila.nombre));
}
