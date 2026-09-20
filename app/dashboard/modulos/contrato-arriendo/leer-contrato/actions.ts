"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { otorgarXp } from "@/lib/wallet";
import { getTutorFeedback } from "@/lib/ai/prompts/tutor";
import { calcularPuntajeClausulas, calcularPuntajePreguntas, calcularPuntajeContrato } from "@/lib/contrato";
import type { Clausula, Pregunta } from "@/lib/contrato";
import { guardarProgreso } from "@/lib/retos";
import type { TutorFeedback } from "@/lib/ai/schemas/tutor";

export interface LeerContratoState {
  error?: string;
  feedback?: TutorFeedback;
}

export async function enviarLecturaContrato(
  clausulas: Clausula[],
  preguntas: Pregunta[],
  _prevState: LeerContratoState,
  formData: FormData
): Promise<LeerContratoState> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "No hay conexión con Supabase." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión expiró. Inicia sesión de nuevo." };

  const { data: reto } = await supabase
    .from("retos")
    .select("id")
    .eq("slug", "leer-contrato")
    .single<{ id: string }>();
  if (!reto) return { error: "No se encontró este reto." };

  const { data: personaje } = await supabase
    .from("personajes")
    .select("id")
    .eq("usuario_id", user.id)
    .single<{ id: string }>();
  if (!personaje) return { error: "No se encontró tu personaje." };

  const seleccionadas = formData.getAll("clausulas_preocupantes").map(String);
  const respuestas: Record<string, number> = {};
  for (const pregunta of preguntas) {
    const valor = formData.get(`pregunta_${pregunta.id}`);
    if (valor !== null) respuestas[pregunta.id] = Number(valor);
  }

  const puntajeClausulas = calcularPuntajeClausulas(seleccionadas, clausulas);
  const puntajePreguntas = calcularPuntajePreguntas(respuestas, preguntas);
  const puntajeFinal = calcularPuntajeContrato(puntajeClausulas, puntajePreguntas);

  const resumenClausulas = clausulas
    .map((c) => `"${c.texto}" — ${seleccionadas.includes(c.id) ? "el estudiante la marcó como preocupante" : "el estudiante NO la marcó"} (en realidad ${c.preocupante ? "SÍ es preocupante" : "es una cláusula normal"})`)
    .join("; ");
  const resumenPreguntas = preguntas
    .map((p) => `"${p.texto}" — respondió "${p.opciones[respuestas[p.id]] ?? "(sin responder)"}" (correcta: "${p.opciones[p.respuesta_correcta]}")`)
    .join("; ");

  const resultadoTutor = await getTutorFeedback({
    retoNombre: "Lee el contrato",
    contextoReto: "El estudiante leyó un contrato de arriendo, marcó qué cláusulas le parecían preocupantes, y respondió preguntas de comprensión sobre el contenido.",
    decisionEstudiante: `Cláusulas: ${resumenClausulas}. Preguntas: ${resumenPreguntas}. Puntaje calculado: ${puntajeFinal}/100.`,
  });

  if (!resultadoTutor.success) {
    return { error: resultadoTutor.error };
  }

  await otorgarXp(supabase, personaje.id, Math.max(resultadoTutor.feedback.puntaje, 10));

  await guardarProgreso(supabase, {
    usuarioId: user.id,
    retoId: reto.id,
    puntaje: resultadoTutor.feedback.puntaje,
    feedbackIa: resultadoTutor.feedback,
  });

  return { feedback: resultadoTutor.feedback };
}
