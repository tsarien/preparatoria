"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { registrarTransaccion, otorgarXp } from "@/lib/wallet";
import { getTutorFeedback } from "@/lib/ai/prompts/tutor";
import { simularEstafador, type MensajeChat, type ResultadoEstafador } from "@/lib/ai/prompts/estafador";
import { calcularRecompensaEstafaEvitada } from "@/lib/estafas";
import { guardarProgreso } from "@/lib/retos";
import type { TutorFeedback } from "@/lib/ai/schemas/tutor";

interface EscenarioConfig {
  canal: string;
  remitente: string;
  mensaje_inicial: string;
  es_estafa: boolean;
  monto_en_riesgo: number | null;
  senales_clave: string[];
  interactivo: boolean;
  descripcion_personaje: string | null;
}

async function getEscenario(supabase: SupabaseClient, retoSlug: string) {
  const { data } = await supabase
    .from("retos")
    .select("id, nombre, config")
    .eq("slug", retoSlug)
    .single<{ id: string; nombre: string; config: EscenarioConfig }>();
  return data;
}

/** Un turno del chat: el estudiante ya escribió el último mensaje de `historial`. */
export async function enviarMensajeChat(
  retoSlug: string,
  historial: MensajeChat[]
): Promise<ResultadoEstafador> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { success: false, error: "No hay conexión con Supabase." };

  const reto = await getEscenario(supabase, retoSlug);
  if (!reto) return { success: false, error: "No se encontró este escenario." };

  return simularEstafador(
    {
      descripcionPersonaje: reto.config.descripcion_personaje ?? "",
      canal: reto.config.canal,
      mensajeInicial: reto.config.mensaje_inicial,
      senalesClave: reto.config.senales_clave,
    },
    historial
  );
}

export interface DecisionResultado {
  success: boolean;
  feedback?: TutorFeedback;
  error?: string;
}

export async function enviarDecision(
  retoSlug: string,
  historial: MensajeChat[],
  diceEstafa: boolean,
  justificacion: string
): Promise<DecisionResultado> {
  if (!justificacion.trim()) {
    return { success: false, error: "Cuéntanos por qué — la justificación no puede estar vacía." };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { success: false, error: "No hay conexión con Supabase." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Tu sesión expiró. Inicia sesión de nuevo." };

  const reto = await getEscenario(supabase, retoSlug);
  if (!reto) return { success: false, error: "No se encontró este escenario." };

  const { data: personaje } = await supabase
    .from("personajes")
    .select("id")
    .eq("usuario_id", user.id)
    .single<{ id: string }>();
  if (!personaje) return { success: false, error: "No se encontró tu personaje." };

  const transcript =
    historial.length > 0
      ? `Así fue la conversación: ${historial.map((m) => `[${m.autor}] ${m.texto}`).join(" / ")}`
      : "El estudiante decidió sin escribirle nada al remitente.";

  const resultadoTutor = await getTutorFeedback({
    retoNombre: reto.nombre,
    contextoReto: `Canal: ${reto.config.canal}. Remitente: "${reto.config.remitente}". Mensaje recibido: "${reto.config.mensaje_inicial}". La VERDAD es que este mensaje ${reto.config.es_estafa ? "SÍ ES UNA ESTAFA" : "NO es una estafa, es legítimo"}. Señales relevantes: ${reto.config.senales_clave.join("; ")}. ${transcript}`,
    decisionEstudiante: `Dijo que ${diceEstafa ? "SÍ es estafa" : "NO es estafa"}. Su justificación: "${justificacion}"`,
  });

  if (!resultadoTutor.success) {
    return { success: false, error: resultadoTutor.error };
  }

  const recompensa = calcularRecompensaEstafaEvitada(diceEstafa, reto.config.es_estafa, reto.config.monto_en_riesgo);
  if (recompensa > 0) {
    await registrarTransaccion(supabase, {
      personajeId: personaje.id,
      tipo: "ingreso",
      monto: recompensa,
      categoria: "estafa_evitada",
      descripcion: "Plata que no perdiste al detectar la estafa",
      origen: `reto:${retoSlug}`,
    });
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
