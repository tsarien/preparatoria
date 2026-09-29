import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireEducador() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol, colegio_id")
    .eq("id", user.id)
    .single<{ rol: string; colegio_id: string | null }>();
  if (perfil?.rol !== "educador") redirect("/dashboard");
  if (!perfil.colegio_id) redirect("/login");

  return { supabase, usuarioId: user.id, colegioId: perfil.colegio_id };
}
