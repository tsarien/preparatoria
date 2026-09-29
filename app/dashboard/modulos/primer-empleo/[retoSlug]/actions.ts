"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPrimerEmpleoFeedback } from "@/lib/ai/prompts/primer-empleo";
import {
  calcularCompletitud,
  calcularPuntajeSenales,
  esOpcionValida,
  esRetoPrimerEmpleo,
  sanitizarTextoIA,
  type ConfigRetoPrimerEmpleo,
} from "@/lib/primer-empleo";
import type { TutorFeedback } from "@/lib/ai/schemas/tutor";
import { getProgreso } from "@/lib/retos";

export interface PrimerEmpleoState {
  error?: string;
  feedback?: TutorFeedback;
}

function leerTexto(formData: FormData, campo: string): string {
  return sanitizarTextoIA(String(formData.get(campo) ?? ""));
}

export async function completarRetoPrimerEmpleo(
  retoSlug: string,
  _prevState: PrimerEmpleoState,
  formData: FormData,
): Promise<PrimerEmpleoState> {
  if (!esRetoPrimerEmpleo(retoSlug)) {
    return { error: "No se encontró este reto." };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "No hay conexión con Supabase." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión expiró. Inicia sesión de nuevo." };

  const { data: reto } = await supabase
    .from("retos")
    .select("id, nombre, config")
    .eq("slug", retoSlug)
    .single<{ id: string; nombre: string; config: unknown }>();
  if (!reto) return { error: "No se encontró este reto." };

  const progresoActual = (await getProgreso(supabase, user.id, reto.id)).data;
  if (progresoActual?.estado === "completado") {
    return { feedback: progresoActual.feedback_ia as TutorFeedback };
  }

  const config = reto.config as ConfigRetoPrimerEmpleo;
  let decisionEstudiante = "";
  let puntajeBase = 0;

  if (retoSlug === "hoja-de-vida") {
    const respuestas = [
      leerTexto(formData, "perfil"),
      leerTexto(formData, "habilidades"),
      leerTexto(formData, "educacion"),
      leerTexto(formData, "experiencia_proyectos"),
      leerTexto(formData, "idiomas"),
    ];
    if (respuestas.slice(0, 3).some((respuesta) => respuesta.length < 3)) {
      return {
        error: "Completa perfil, habilidades y educación para continuar.",
      };
    }
    puntajeBase = calcularCompletitud(respuestas);
    decisionEstudiante = CAMPOS_HOJA.map(
      (campo, indice) => `${campo}: ${respuestas[indice] || "Sin completar"}`,
    ).join("; ");
  } else if (retoSlug === "elegir-oferta" || retoSlug === "comparar-ofertas") {
    const ofertas = config.ofertas ?? [];
    const ofertaId = String(formData.get("oferta_id") ?? "");
    const oferta = ofertas.find((opcion) => opcion.id === ofertaId);
    const motivo = leerTexto(formData, "motivo");
    if (
      !oferta ||
      !esOpcionValida(
        ofertaId,
        ofertas.map((opcion) => opcion.id),
      )
    ) {
      return { error: "Elige una de las opciones disponibles." };
    }
    if (motivo.length < 20) {
      return {
        error: "Explica brevemente qué condiciones influyeron en tu decisión.",
      };
    }
    puntajeBase = Math.min(100, 60 + Math.round((motivo.length / 120) * 40));
    decisionEstudiante = `Eligió ${oferta.titulo}. Motivo: ${motivo}`;
  } else if (retoSlug === "oferta-sospechosa") {
    const senales = config.senales ?? [];
    const correctas = config.correctas ?? [];
    const seleccionadas = formData.getAll("senal").map(String);
    if (
      seleccionadas.some(
        (senal) => !senales.some((opcion) => opcion.id === senal),
      )
    ) {
      return { error: "La selección contiene una señal no disponible." };
    }
    puntajeBase = calcularPuntajeSenales(seleccionadas, correctas);
    decisionEstudiante = `Señales identificadas: ${
      seleccionadas
        .map((id) => senales.find((senal) => senal.id === id)?.texto)
        .filter(Boolean)
        .join("; ") || "No identificó señales"
    }.`;
  } else {
    const preguntas = config.preguntas ?? [];
    const respuestas = preguntas.map((_, indice) =>
      leerTexto(formData, `respuesta_${indice + 1}`),
    );
    if (
      respuestas.length === 0 ||
      respuestas.some((respuesta) => respuesta.length < 12)
    ) {
      return { error: "Responde cada pregunta con una idea o ejemplo breve." };
    }
    puntajeBase = calcularCompletitud(respuestas);
    decisionEstudiante = preguntas
      .map((pregunta, indice) => `${pregunta}: ${respuestas[indice]}`)
      .join("; ");
  }

  const resultado = await getPrimerEmpleoFeedback({
    retoNombre: reto.nombre,
    contextoReto: `${JSON.stringify(config)} Puntaje inicial de completitud: ${puntajeBase}%.`,
    decisionEstudiante,
  });
  if (!resultado.success) return { error: resultado.error };

  const { error } = await supabase.rpc("completar_reto_primer_empleo", {
    p_slug: retoSlug,
    p_puntaje: resultado.feedback.puntaje,
    p_feedback: resultado.feedback,
  });
  if (error)
    return { error: "No se pudo guardar el resultado. Intenta otra vez." };

  return { feedback: resultado.feedback };
}

const CAMPOS_HOJA = [
  "Perfil profesional",
  "Habilidades",
  "Educación",
  "Proyectos o experiencia",
  "Idiomas",
];
