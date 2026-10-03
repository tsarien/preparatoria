"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  simularGuia,
  VENTANA_CONTEXTO,
  type MensajeGuia,
} from "@/lib/ai/prompts/guia";
import { esUuid } from "@/lib/utils";
import {
  MAX_CARACTERES_MENSAJE,
  MAX_MENSAJES_CARGADOS,
  type ConversacionResumen,
  type EnviarMensajeResultado,
  type EstadoGuia,
} from "./types";

// NOTA IMPORTANTE: este archivo lleva "use server", así que Next.js solo
// permite exportar funciones async. Cualquier const o interface compartido
// vive en ./types.ts — NO moverlos aquí aunque parezca cómodo.

const ESTADO_VACIO: EstadoGuia = {
  conversacionId: null,
  mensajes: [],
  conversaciones: [],
};

/**
 * Contexto autenticado de la IA Guía. Disponible para estudiantes y educadores (cada quien
 * con SU historial, por RLS y por filtro explícito); el administrador no usa la guía.
 */
async function contextoGuia() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("nombre, rol, activo")
    .eq("id", user.id)
    .single<{ nombre: string; rol: string; activo: boolean }>();
  if (
    !perfil ||
    !perfil.activo ||
    !["estudiante", "educador"].includes(perfil.rol)
  )
    return null;

  return { supabase, userId: user.id, perfil };
}

type ContextoGuia = NonNullable<Awaited<ReturnType<typeof contextoGuia>>>;

async function leerMensajes(
  ctx: ContextoGuia,
  conversacionId: string,
  limite: number,
): Promise<MensajeGuia[]> {
  // Se piden los MÁS RECIENTES (descendente) y luego se invierte: con orden ascendente + limit
  // una conversación larga mostraría solo sus mensajes más viejos.
  const { data } = await ctx.supabase
    .from("mensajes_ia_guia")
    .select("autor, texto")
    .eq("perfil_id", ctx.userId)
    .eq("conversacion_id", conversacionId)
    .order("creado_en", { ascending: false })
    .limit(limite);

  return (data ?? [])
    .reverse()
    .map((m) => ({ autor: m.autor as "guia" | "estudiante", texto: m.texto }));
}

async function listarConversacionesDe(
  ctx: ContextoGuia,
): Promise<ConversacionResumen[]> {
  const { data } = await ctx.supabase
    .from("conversaciones_ia")
    .select("id, titulo, actualizado_en")
    .eq("perfil_id", ctx.userId)
    .eq("tipo", "guia")
    .order("actualizado_en", { ascending: false })
    .limit(30);
  return (data ?? []) as ConversacionResumen[];
}

/**
 * Estado inicial del chat: lista de conversaciones + la conversación pedida (o la más
 * reciente) con sus mensajes. Al volver a iniciar sesión el usuario recupera todo.
 */
export async function cargarEstadoGuia(
  conversacionId?: string | null,
): Promise<EstadoGuia> {
  const ctx = await contextoGuia();
  if (!ctx) return ESTADO_VACIO;

  const conversaciones = await listarConversacionesDe(ctx);
  const elegida =
    conversaciones.find((c) => c.id === conversacionId) ?? conversaciones[0];
  if (!elegida) return { ...ESTADO_VACIO, conversaciones };

  return {
    conversacionId: elegida.id,
    mensajes: await leerMensajes(ctx, elegida.id, MAX_MENSAJES_CARGADOS),
    conversaciones,
  };
}

/** Abre una conversación concreta del usuario (con sus mensajes más recientes). */
export async function abrirConversacionGuia(
  conversacionId: string,
): Promise<{ conversacionId: string; mensajes: MensajeGuia[] } | null> {
  const ctx = await contextoGuia();
  if (!ctx || !esUuid(String(conversacionId ?? ""))) return null;

  const { data: conversacion } = await ctx.supabase
    .from("conversaciones_ia")
    .select("id")
    .eq("id", conversacionId)
    .eq("perfil_id", ctx.userId)
    .eq("tipo", "guia")
    .maybeSingle<{ id: string }>();
  if (!conversacion) return null;

  return {
    conversacionId: conversacion.id,
    mensajes: await leerMensajes(ctx, conversacion.id, MAX_MENSAJES_CARGADOS),
  };
}

/** Cuántos mensajes del estudiante se han enviado en las últimas 24h. Informativo. */
export async function contarMensajesHoy(): Promise<number> {
  const ctx = await contextoGuia();
  if (!ctx) return 0;

  const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await ctx.supabase
    .from("mensajes_ia_guia")
    .select("id", { count: "exact", head: true })
    .eq("perfil_id", ctx.userId)
    .eq("autor", "estudiante")
    .gte("creado_en", hace24h);

  return count ?? 0;
}

function tituloDesde(texto: string): string {
  const limpio = texto.replace(/\s+/g, " ").trim();
  return limpio.length > 60 ? `${limpio.slice(0, 57)}…` : limpio;
}

export async function enviarMensajeGuia(
  texto: string,
  conversacionId?: string | null,
): Promise<EnviarMensajeResultado> {
  const limpio = String(texto ?? "").trim();
  if (!limpio)
    return { success: false, error: "Escribe algo antes de enviar." };
  if (limpio.length > MAX_CARACTERES_MENSAJE) {
    return {
      success: false,
      error: `El mensaje es demasiado largo (máximo ${MAX_CARACTERES_MENSAJE} caracteres).`,
    };
  }

  const ctx = await contextoGuia();
  if (!ctx)
    return {
      success: false,
      error: "Tu sesión expiró. Inicia sesión de nuevo.",
    };
  const { supabase, userId, perfil } = ctx;

  // ── TOPE DIARIO (deshabilitado) ────────────────────────────────────────
  // Reactivar cuando se decida aplicar el límite de costo. Importar
  // MAX_MENSAJES_DIA desde "./types" (ya está listo).
  //
  // const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  // const { count } = await supabase
  //   .from("mensajes_ia_guia")
  //   .select("id", { count: "exact", head: true })
  //   .eq("perfil_id", userId)
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

  // Conversación: existente (debe ser del usuario y de tipo guía) o nueva.
  let idConversacion: string;
  let titulo: string | undefined;
  if (conversacionId) {
    if (!esUuid(conversacionId))
      return { success: false, error: "Conversación no encontrada." };
    const { data: existente } = await supabase
      .from("conversaciones_ia")
      .select("id, titulo")
      .eq("id", conversacionId)
      .eq("perfil_id", userId)
      .eq("tipo", "guia")
      .maybeSingle<{ id: string; titulo: string }>();
    if (!existente)
      return { success: false, error: "Conversación no encontrada." };
    idConversacion = existente.id;
    titulo = existente.titulo;
  } else {
    const { data: nueva, error: errorNueva } = await supabase
      .from("conversaciones_ia")
      .insert({ perfil_id: userId, tipo: "guia", titulo: tituloDesde(limpio) })
      .select("id, titulo")
      .single<{ id: string; titulo: string }>();
    if (errorNueva || !nueva)
      return {
        success: false,
        error: "No se pudo iniciar la conversación. Intenta de nuevo.",
      };
    idConversacion = nueva.id;
    titulo = nueva.titulo;
  }

  const { data: personaje } = await supabase
    .from("personajes")
    .select("nivel, saldo_billetera")
    .eq("usuario_id", userId)
    .maybeSingle<{ nivel: number; saldo_billetera: number }>();

  const historialAnterior = await leerMensajes(
    ctx,
    idConversacion,
    VENTANA_CONTEXTO,
  );

  // Guarda el mensaje del usuario ANTES de llamar a la IA. Queda registrado aunque la
  // llamada falle — útil para auditoría.
  await supabase.from("mensajes_ia_guia").insert({
    perfil_id: userId,
    conversacion_id: idConversacion,
    autor: "estudiante",
    texto: limpio,
  });

  const resultado = await simularGuia(
    {
      nombre: perfil.nombre ?? "estudiante",
      nivel: personaje?.nivel ?? 1,
      saldoBilletera: personaje?.saldo_billetera ?? 0,
    },
    [...historialAnterior, { autor: "estudiante", texto: limpio }],
  );

  if (!resultado.success)
    return {
      success: false,
      error: resultado.error,
      conversacionId: idConversacion,
      titulo,
    };

  await supabase.from("mensajes_ia_guia").insert({
    perfil_id: userId,
    conversacion_id: idConversacion,
    autor: "guia",
    texto: resultado.mensaje,
  });
  await supabase
    .from("conversaciones_ia")
    .update({ actualizado_en: new Date().toISOString() })
    .eq("id", idConversacion)
    .eq("perfil_id", userId);

  revalidatePath("/dashboard/guia");
  return {
    success: true,
    respuesta: resultado.mensaje,
    conversacionId: idConversacion,
    titulo,
  };
}

/** Borra UNA conversación del usuario (sus mensajes se eliminan en cascada). */
export async function borrarConversacion(
  conversacionId: string,
): Promise<{ success: boolean }> {
  const ctx = await contextoGuia();
  if (!ctx || !esUuid(String(conversacionId ?? ""))) return { success: false };

  const { error } = await ctx.supabase
    .from("conversaciones_ia")
    .delete()
    .eq("id", conversacionId)
    .eq("perfil_id", ctx.userId)
    .eq("tipo", "guia");

  revalidatePath("/dashboard/guia");
  return { success: !error };
}

/** Borra TODO el historial de IA Guía del usuario (conversaciones y mensajes heredados). */
export async function borrarHistorial(): Promise<{ success: boolean }> {
  const ctx = await contextoGuia();
  if (!ctx) return { success: false };

  const { error: errorConversaciones } = await ctx.supabase
    .from("conversaciones_ia")
    .delete()
    .eq("perfil_id", ctx.userId)
    .eq("tipo", "guia");
  const { error: errorMensajes } = await ctx.supabase
    .from("mensajes_ia_guia")
    .delete()
    .eq("perfil_id", ctx.userId);

  revalidatePath("/dashboard/guia");
  return { success: !errorConversaciones && !errorMensajes };
}
