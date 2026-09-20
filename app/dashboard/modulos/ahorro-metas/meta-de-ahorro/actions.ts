"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { otorgarXp } from "@/lib/wallet";
import { aportarAMeta, calcularMesesParaMeta, type ResultadoAporte } from "@/lib/ahorro";
import { getTutorFeedback } from "@/lib/ai/prompts/tutor";
import { guardarProgreso } from "@/lib/retos";
import type { TutorFeedback } from "@/lib/ai/schemas/tutor";
import type { MetaAhorro } from "@/types/database";

export interface CrearMetaState {
  error?: string;
  feedback?: TutorFeedback;
}

export async function crearMeta(_prevState: CrearMetaState, formData: FormData): Promise<CrearMetaState> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "No hay conexión con Supabase." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión expiró. Inicia sesión de nuevo." };

  const nombre = String(formData.get("nombre") ?? "").trim();
  const montoObjetivo = Number(formData.get("monto_objetivo"));
  const aporteMensual = Number(formData.get("aporte_mensual"));

  if (!nombre || !montoObjetivo || montoObjetivo <= 0) {
    return { error: "Ponle un nombre a tu meta y un monto objetivo mayor a cero." };
  }
  if (!aporteMensual || aporteMensual <= 0) {
    return { error: "Define cuánto planeas aportar cada mes (mayor a cero)." };
  }

  const { data: reto } = await supabase
    .from("retos")
    .select("id")
    .eq("slug", "meta-de-ahorro")
    .single<{ id: string }>();
  if (!reto) return { error: "No se encontró este reto." };

  const { data: personaje } = await supabase
    .from("personajes")
    .select("id, salario_mensual, saldo_billetera")
    .eq("usuario_id", user.id)
    .single<{ id: string; salario_mensual: number; saldo_billetera: number }>();
  if (!personaje) return { error: "No se encontró tu personaje." };

  const { data: metaExistente } = await supabase
    .from("metas_ahorro")
    .select("id")
    .eq("personaje_id", personaje.id)
    .maybeSingle<{ id: string }>();
  if (metaExistente) return { error: "Ya tienes una meta activa." };

  const { error: errorMeta } = await supabase.from("metas_ahorro").insert({
    personaje_id: personaje.id,
    nombre,
    monto_objetivo: montoObjetivo,
    aporte_mensual_planeado: aporteMensual,
  });
  if (errorMeta) return { error: "No se pudo crear la meta. Intenta de nuevo." };

  const meses = calcularMesesParaMeta(montoObjetivo, 0, aporteMensual);

  const resultadoTutor = await getTutorFeedback({
    retoNombre: "Crea tu meta de ahorro",
    contextoReto: `El estudiante tiene un salario mensual simulado de $${personaje.salario_mensual.toLocaleString("es-CO")} y un saldo actual de $${personaje.saldo_billetera.toLocaleString("es-CO")}. Definió una meta de ahorro.`,
    decisionEstudiante: `Meta: "${nombre}", monto objetivo: $${montoObjetivo.toLocaleString("es-CO")}, aporte mensual planeado: $${aporteMensual.toLocaleString("es-CO")} (le tomaría aproximadamente ${meses} meses). Evalúa si este plan es realista dado su salario.`,
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

  revalidatePath("/dashboard/modulos/ahorro-metas/meta-de-ahorro");

  return { feedback: resultadoTutor.feedback };
}

/** Aporte puntual a la meta ya creada — no genera una nueva evaluación de IA, solo mueve la plata. */
export async function hacerAporte(metaId: string, monto: number): Promise<ResultadoAporte> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { success: false, error: "No hay conexión con Supabase." };
  return aportarAMeta(supabase, metaId, monto);
}

export async function getMetaActual(): Promise<MetaAhorro | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: personaje } = await supabase
    .from("personajes")
    .select("id")
    .eq("usuario_id", user.id)
    .single<{ id: string }>();
  if (!personaje) return null;

  const { data: meta } = await supabase
    .from("metas_ahorro")
    .select("*")
    .eq("personaje_id", personaje.id)
    .maybeSingle<MetaAhorro>();
  return meta;
}
