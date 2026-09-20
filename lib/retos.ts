import type { SupabaseClient } from "@supabase/supabase-js";
import type { Reto, ProgresoUsuarioReto } from "@/types/database";

export async function getRetoPorSlug(supabase: SupabaseClient, slug: string) {
  return supabase.from("retos").select("id, nombre, tipo, dificultad, config").eq("slug", slug).single<
    Pick<Reto, "id" | "nombre" | "tipo" | "dificultad" | "config">
  >();
}

export async function getProgreso(supabase: SupabaseClient, usuarioId: string, retoId: string) {
  return supabase
    .from("progreso_usuario_reto")
    .select("estado, intentos, puntaje, feedback_ia")
    .eq("usuario_id", usuarioId)
    .eq("reto_id", retoId)
    .maybeSingle<Pick<ProgresoUsuarioReto, "estado" | "intentos" | "puntaje" | "feedback_ia">>();
}

interface GuardarProgresoInput {
  usuarioId: string;
  retoId: string;
  puntaje: number;
  feedbackIa: unknown;
}

/** Suma un intento y marca el reto como completado con el puntaje/feedback más reciente. */
export async function guardarProgreso(supabase: SupabaseClient, input: GuardarProgresoInput) {
  const { data: existente } = await getProgreso(supabase, input.usuarioId, input.retoId);

  return supabase
    .from("progreso_usuario_reto")
    .upsert(
      {
        usuario_id: input.usuarioId,
        reto_id: input.retoId,
        estado: "completado",
        intentos: (existente?.intentos ?? 0) + 1,
        puntaje: input.puntaje,
        feedback_ia: input.feedbackIa,
        completado_en: new Date().toISOString(),
        actualizado_en: new Date().toISOString(),
      },
      { onConflict: "usuario_id,reto_id" }
    );
}
