"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { otorgarXp } from "@/lib/wallet";
import { getTutorFeedback } from "@/lib/ai/prompts/tutor";
import { simularArrendador, type MensajeChat, type ResultadoArrendador } from "@/lib/ai/prompts/arrendador";
import { guardarProgreso } from "@/lib/retos";
import type { TutorFeedback } from "@/lib/ai/schemas/tutor";

interface EscenarioConfig {
  mensaje_inicial: string;
  punto_negociacion: string;
  descripcion_personaje: string;
}

async function getEscenario(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const { data } = await supabase!
    .from("retos")
    .select("id, config")
    .eq("slug", "negociar-arrendador")
    .single<{ id: string; config: EscenarioConfig }>();
  return data;
}

/** Un turno del chat: el estudiante ya escribió el último mensaje de `historial`. */
export async function enviarMensajeNegociacion(historial: MensajeChat[]): Promise<ResultadoArrendador> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { success: false, error: "No hay conexión con Supabase." };

  const reto = await getEscenario(supabase);
  if (!reto) return { success: false, error: "No se encontró este escenario." };

  return simularArrendador(
    {
      descripcionPersonaje: reto.config.descripcion_personaje,
      puntoNegociacion: reto.config.punto_negociacion,
      mensajeInicial: reto.config.mensaje_inicial,
    },
    historial
  );
}

export interface FinalizarNegociacionResultado {
  success: boolean;
  feedback?: TutorFeedback;
  error?: string;
}

export async function finalizarNegociacion(historial: MensajeChat[]): Promise<FinalizarNegociacionResultado> {
  if (historial.length === 0) {
    return { success: false, error: "Escríbele algo al arrendador antes de terminar la negociación." };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { success: false, error: "No hay conexión con Supabase." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Tu sesión expiró. Inicia sesión de nuevo." };

  const reto = await getEscenario(supabase);
  if (!reto) return { success: false, error: "No se encontró este escenario." };

  const { data: personaje } = await supabase
    .from("personajes")
    .select("id")
    .eq("usuario_id", user.id)
    .single<{ id: string }>();
  if (!personaje) return { success: false, error: "No se encontró tu personaje." };

  const transcript = historial.map((m) => `[${m.autor}] ${m.texto}`).join(" / ");

  const resultadoTutor = await getTutorFeedback({
    retoNombre: "Negocia con el arrendador",
    contextoReto: `El estudiante debía negociar este punto del contrato: "${reto.config.punto_negociacion}". Evalúa qué tan bien argumentó, si fue respetuoso pero firme, y si logró (o intentó lograr) el objetivo.`,
    decisionEstudiante: `Transcripción de la negociación: ${transcript}`,
  });

  if (!resultadoTutor.success) {
    return { success: false, error: resultadoTutor.error };
  }

  await otorgarXp(supabase, personaje.id, Math.max(resultadoTutor.feedback.puntaje, 10));

  await guardarProgreso(supabase, {
    usuarioId: user.id,
    retoId: reto.id,
    puntaje: resultadoTutor.feedback.puntaje,
    feedbackIa: resultadoTutor.feedback,
  });

  return { success: true, feedback: resultadoTutor.feedback };
}
