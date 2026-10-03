import "server-only";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export interface ContextoEducador {
  supabase: SupabaseClient<Database>;
  usuarioId: string;
  colegioId: string;
  nombre: string;
}

/**
 * Sesión actual si es de un EDUCADOR ACTIVO con colegio; si no, null (sin redirigir).
 * Para Server Actions: toda acción educativa debe llamarla y verificar el resultado.
 */
export async function contextoEducador(): Promise<ContextoEducador | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol, colegio_id, activo, nombre")
    .eq("id", user.id)
    .single<{
      rol: string;
      colegio_id: string | null;
      activo: boolean;
      nombre: string;
    }>();
  if (!perfil || perfil.rol !== "educador" || !perfil.activo || !perfil.colegio_id)
    return null;

  return {
    supabase,
    usuarioId: user.id,
    colegioId: perfil.colegio_id,
    nombre: perfil.nombre,
  };
}

/** Para páginas: redirige si no es un educador activo. */
export async function requireEducador() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const contexto = await contextoEducador();
  if (!contexto) redirect("/dashboard");

  return contexto;
}
