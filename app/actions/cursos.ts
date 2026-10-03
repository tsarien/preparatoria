"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { obtenerCursosColegio } from "@/lib/cursos-server";

/** Cursos configurados para un colegio. Datos públicos (la RLS ya permite leerlos a anon). */
export async function listarCursosColegio(colegioId: string): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  return obtenerCursosColegio(supabase, String(colegioId ?? ""));
}
