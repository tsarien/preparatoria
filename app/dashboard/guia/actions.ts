"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  simularGuia,
  VENTANA_CONTEXTO,
  type MensajeGuia,
} from "@/lib/ai/prompts/guia";
import type { EnviarMensajeResultado } from "./types";

// NOTA IMPORTANTE: este archivo lleva "use server", así que Next.js solo
// permite exportar funciones async. Cualquier const o interface compartido
// vive en ./types.ts — NO moverlos aquí aunque parezca cómodo.

export async function getHistorial(): Promise<MensajeGuia[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("mensajes_ia_guia")
    .select("autor, texto, creado_en")
    .eq("perfil_id", user.id)
    .order("creado_en", { ascending: true })
    .limit(60);

  return (data ?? []).map((m) => ({
    autor: m.autor as "guia" | "estudiante",
    texto: m.texto,
  }));
}

/** Cuántos mensajes del estudiante se han enviado en las últimas 24h. Informativo. */
export async function contarMensajesHoy(): Promise<number> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return 0;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("mensajes_ia_guia")
    .select("id", { count: "exact", head: true })
    .eq("perfil_id", user.id)
    .eq("autor", "estudiante")
    .gte("creado_en", hace24h);

  return count ?? 0;
}

export async function enviarMensajeGuia(
  texto: string,
): Promise<EnviarMensajeResultado> {
  const limpio = texto.trim();
  if (!limpio)
    return { success: false, error: "Escribe algo antes de enviar." };
  if (limpio.length > 800) {
    return {
      success: false,
      error: "El mensaje es demasiado largo (máximo 800 caracteres).",
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase)
    return { success: false, error: "No hay conexión con Supabase." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return {
      success: false,
      error: "Tu sesión expiró. Inicia sesión de nuevo.",
    };

  // ── TOPE DIARIO (deshabilitado) ────────────────────────────────────────
  // Reactivar cuando se decida aplicar el límite de costo. Importar
  // MAX_MENSAJES_DIA desde "./types" (ya está listo).
  //
  // const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  // const { count } = await supabase
  //   .from("mensajes_ia_guia")
  //   .select("id", { count: "exact", head: true })
  //   .eq("perfil_id", user.id)
  //   .eq("autor", "estudiante")
  //   .gte("creado_en", hace24h);
  //
  // if ((count ?? 0) >= MAX_MENSAJES_DIA) {
  //   return {
  //     success: false,
  //     error: `Llegaste al límite de ${MAX_MENSAJES_DIA} mensajes por día. Vuelve mañana.`,
  //   };
  // }
  // ───────────────────────────────────────────────────────────────────────

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("nombre")
    .eq("id", user.id)
    .single<{ nombre: string }>();

  const { data: personaje } = await supabase
    .from("personajes")
    .select("nivel, saldo_billetera")
    .eq("usuario_id", user.id)
    .single<{ nivel: number; saldo_billetera: number }>();

  const { data: historialDb } = await supabase
    .from("mensajes_ia_guia")
    .select("autor, texto")
    .eq("perfil_id", user.id)
    .order("creado_en", { ascending: false })
    .limit(VENTANA_CONTEXTO);

  const historialAnterior: MensajeGuia[] = (historialDb ?? [])
    .reverse()
    .map((m) => ({ autor: m.autor as "guia" | "estudiante", texto: m.texto }));

  // Guarda el mensaje del estudiante ANTES de llamar a Gemini. Queda
  // registrado aunque la llamada falle — útil para auditoría.
  await supabase.from("mensajes_ia_guia").insert({
    perfil_id: user.id,
    autor: "estudiante",
    texto: limpio,
  });

  const contexto = {
    nombre: perfil?.nombre ?? "estudiante",
    nivel: personaje?.nivel ?? 1,
    saldoBilletera: personaje?.saldo_billetera ?? 0,
  };

  const resultado = await simularGuia(contexto, [
    ...historialAnterior,
    { autor: "estudiante", texto: limpio },
  ]);

  if (!resultado.success) return { success: false, error: resultado.error };

  await supabase.from("mensajes_ia_guia").insert({
    perfil_id: user.id,
    autor: "guia",
    texto: resultado.mensaje,
  });

  revalidatePath("/dashboard/guia");
  return { success: true, respuesta: resultado.mensaje };
}

export async function borrarHistorial(): Promise<{ success: boolean }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { success: false };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false };

  await supabase.from("mensajes_ia_guia").delete().eq("perfil_id", user.id);

  revalidatePath("/dashboard/guia");
  return { success: true };
}
