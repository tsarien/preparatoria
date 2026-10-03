"use server";

import { revalidatePath } from "next/cache";
import { contextoEducador, type ContextoEducador } from "@/lib/educacion-server";
import {
  obtenerEstudiantesEducador,
  resumirDatosEducativos,
} from "@/lib/educacion";
import {
  generarSugerenciaEducativa,
  type TurnoPrevio,
} from "@/lib/ai/prompts/educador";
import {
  TURNOS_DE_CONTEXTO,
  extraerInforme,
  informeATexto,
  validarPreguntaEducativa,
} from "@/lib/ia-educativa";
import { sanitizarTextoIA } from "@/lib/primer-empleo";
import { esUuid } from "@/lib/utils";
import {
  MAX_MENSAJES_EDUCATIVOS_CARGADOS,
  type ConsultaEducativaResultado,
  type ConversacionEducativaResumen,
  type EstadoIAEducativa,
  type MensajeEducativoVista,
} from "./types";

// IA educativa del EDUCADOR. Historial propio (tabla mensajes_ia_educativa + conversaciones_ia
// con tipo 'educativa'), separado del de la IA Guía. Toda acción verifica en servidor que la
// sesión sea de un educador activo y filtra por su id; la RLS lo vuelve a garantizar.

const ESTADO_VACIO: EstadoIAEducativa = {
  conversacionId: null,
  mensajes: [],
  conversaciones: [],
};

type Fila = {
  id: string;
  autor: string;
  texto: string;
  contexto: unknown;
  creado_en: string;
};

function aVista(fila: Fila): MensajeEducativoVista {
  return {
    id: fila.id,
    autor: fila.autor === "educador" ? "educador" : "ia",
    texto: fila.texto,
    informe: fila.autor === "ia" ? extraerInforme(fila.contexto) : null,
    creado_en: fila.creado_en,
  };
}

async function leerMensajes(
  ctx: ContextoEducador,
  conversacionId: string,
  limite: number,
): Promise<MensajeEducativoVista[]> {
  // Los MÁS RECIENTES (descendente) y luego se invierten, para no perder lo último en conversaciones largas.
  const { data } = await ctx.supabase
    .from("mensajes_ia_educativa")
    .select("id, autor, texto, contexto, creado_en")
    .eq("educador_id", ctx.usuarioId)
    .eq("conversacion_id", conversacionId)
    .order("creado_en", { ascending: false })
    .limit(limite);
  return ((data ?? []) as Fila[]).reverse().map(aVista);
}

async function listarConversaciones(
  ctx: ContextoEducador,
): Promise<ConversacionEducativaResumen[]> {
  const { data } = await ctx.supabase
    .from("conversaciones_ia")
    .select("id, titulo, actualizado_en")
    .eq("perfil_id", ctx.usuarioId)
    .eq("tipo", "educativa")
    .order("actualizado_en", { ascending: false })
    .limit(30);
  return (data ?? []) as ConversacionEducativaResumen[];
}

/** Lista de conversaciones + la pedida (o la más reciente) con sus mensajes. */
export async function cargarEstadoIAEducativa(
  conversacionId?: string | null,
): Promise<EstadoIAEducativa> {
  const ctx = await contextoEducador();
  if (!ctx) return ESTADO_VACIO;

  const conversaciones = await listarConversaciones(ctx);
  const elegida =
    conversaciones.find((c) => c.id === conversacionId) ?? conversaciones[0];
  if (!elegida) return { ...ESTADO_VACIO, conversaciones };

  return {
    conversacionId: elegida.id,
    mensajes: await leerMensajes(ctx, elegida.id, MAX_MENSAJES_EDUCATIVOS_CARGADOS),
    conversaciones,
  };
}

export async function abrirConversacionEducativa(
  conversacionId: string,
): Promise<{ conversacionId: string; mensajes: MensajeEducativoVista[] } | null> {
  const ctx = await contextoEducador();
  if (!ctx || !esUuid(String(conversacionId ?? ""))) return null;

  const { data } = await ctx.supabase
    .from("conversaciones_ia")
    .select("id")
    .eq("id", conversacionId)
    .eq("perfil_id", ctx.usuarioId)
    .eq("tipo", "educativa")
    .maybeSingle<{ id: string }>();
  if (!data) return null;

  return {
    conversacionId: data.id,
    mensajes: await leerMensajes(ctx, data.id, MAX_MENSAJES_EDUCATIVOS_CARGADOS),
  };
}

function tituloDesde(texto: string): string {
  const limpio = texto.replace(/\s+/g, " ").trim();
  return limpio.length > 60 ? `${limpio.slice(0, 57)}…` : limpio;
}

export async function consultarIAEducativa(
  conversacionId: string | null,
  preguntaBruta: string,
  estudianteId: string | null,
): Promise<ConsultaEducativaResultado> {
  const ctx = await contextoEducador();
  if (!ctx)
    return { success: false, error: "Tu sesión expiró. Inicia sesión de nuevo." };

  const pregunta = sanitizarTextoIA(String(preguntaBruta ?? ""), 500);
  const errorPregunta = validarPreguntaEducativa(pregunta);
  if (errorPregunta) return { success: false, error: errorPregunta };

  // Datos educativos: solo estudiantes de SU colegio con consentimiento aprobado (RPC con filtros en SQL).
  const { estudiantes, error } = await obtenerEstudiantesEducador(ctx.supabase);
  if (error) return { success: false, error };
  const idEstudiante = estudianteId ? String(estudianteId).trim() : "";
  const estudiante = idEstudiante
    ? estudiantes.find((item) => item.estudiante_id === idEstudiante)
    : null;
  if (idEstudiante && !estudiante)
    return { success: false, error: "No se encontró ese estudiante en tu colegio." };
  const seleccionados = estudiante ? [estudiante] : estudiantes;
  if (seleccionados.length === 0)
    return { success: false, error: "No hay datos educativos para consultar." };

  // Conversación existente (debe ser del educador y de tipo educativa) o nueva.
  let idConversacion: string;
  let titulo: string;
  let historialPrevio: TurnoPrevio[] = [];
  if (conversacionId) {
    if (!esUuid(conversacionId))
      return { success: false, error: "Conversación no encontrada." };
    const { data: existente } = await ctx.supabase
      .from("conversaciones_ia")
      .select("id, titulo")
      .eq("id", conversacionId)
      .eq("perfil_id", ctx.usuarioId)
      .eq("tipo", "educativa")
      .maybeSingle<{ id: string; titulo: string }>();
    if (!existente)
      return { success: false, error: "Conversación no encontrada." };
    idConversacion = existente.id;
    titulo = existente.titulo;
    historialPrevio = (await leerMensajes(ctx, idConversacion, TURNOS_DE_CONTEXTO)).map(
      (m) => ({ autor: m.autor, texto: m.texto }),
    );
  } else {
    const { data: nueva, error: errorNueva } = await ctx.supabase
      .from("conversaciones_ia")
      .insert({
        perfil_id: ctx.usuarioId,
        tipo: "educativa",
        titulo: tituloDesde(pregunta),
      })
      .select("id, titulo")
      .single<{ id: string; titulo: string }>();
    if (errorNueva || !nueva)
      return { success: false, error: "No se pudo iniciar la conversación." };
    idConversacion = nueva.id;
    titulo = nueva.titulo;
  }

  const contextoConsulta = {
    estudiante_id: estudiante?.estudiante_id ?? null,
    curso: estudiante?.curso ?? null,
  };
  const { data: filaPregunta, error: errorPregunta2 } = await ctx.supabase
    .from("mensajes_ia_educativa")
    .insert({
      educador_id: ctx.usuarioId,
      conversacion_id: idConversacion,
      autor: "educador",
      texto: pregunta,
      contexto: contextoConsulta,
    })
    .select("id, autor, texto, contexto, creado_en")
    .single<Fila>();
  if (errorPregunta2 || !filaPregunta)
    return {
      success: false,
      error: "No se pudo guardar tu consulta.",
      conversacionId: idConversacion,
      titulo,
    };

  const resultado = await generarSugerenciaEducativa(
    resumirDatosEducativos(seleccionados, estudiante?.curso ?? null),
    pregunta,
    historialPrevio,
  );
  if (!resultado.success)
    return {
      success: false,
      error: resultado.error,
      conversacionId: idConversacion,
      titulo,
      mensajes: [aVista(filaPregunta)],
    };

  const { data: filaRespuesta } = await ctx.supabase
    .from("mensajes_ia_educativa")
    .insert({
      educador_id: ctx.usuarioId,
      conversacion_id: idConversacion,
      autor: "ia",
      texto: informeATexto(resultado.informe),
      contexto: { ...contextoConsulta, informe: resultado.informe },
    })
    .select("id, autor, texto, contexto, creado_en")
    .single<Fila>();
  await ctx.supabase
    .from("conversaciones_ia")
    .update({ actualizado_en: new Date().toISOString() })
    .eq("id", idConversacion)
    .eq("perfil_id", ctx.usuarioId);

  revalidatePath("/dashboard/educador/ia");
  return {
    success: true,
    conversacionId: idConversacion,
    titulo,
    mensajes: [aVista(filaPregunta), ...(filaRespuesta ? [aVista(filaRespuesta)] : [])],
  };
}

export async function borrarConversacionEducativa(
  conversacionId: string,
): Promise<{ success: boolean }> {
  const ctx = await contextoEducador();
  if (!ctx || !esUuid(String(conversacionId ?? ""))) return { success: false };

  const { error } = await ctx.supabase
    .from("conversaciones_ia")
    .delete()
    .eq("id", conversacionId)
    .eq("perfil_id", ctx.usuarioId)
    .eq("tipo", "educativa");

  revalidatePath("/dashboard/educador/ia");
  return { success: !error };
}
