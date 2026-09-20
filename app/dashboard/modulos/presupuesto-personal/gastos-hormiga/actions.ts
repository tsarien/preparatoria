"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { registrarTransaccion, otorgarXp } from "@/lib/wallet";
import { getTutorFeedback } from "@/lib/ai/prompts/tutor";
import { calcularPuntajeGastosHormiga, ahorroPorGastosHormigaDetectados, type GastoHormigaItem } from "@/lib/presupuesto";
import { guardarProgreso } from "@/lib/retos";
import type { TutorFeedback } from "@/lib/ai/schemas/tutor";

export interface GastosHormigaState {
  error?: string;
  feedback?: TutorFeedback;
}

export async function enviarGastosHormiga(
  items: GastoHormigaItem[],
  _prevState: GastosHormigaState,
  formData: FormData
): Promise<GastosHormigaState> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "No hay conexión con Supabase." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión expiró. Inicia sesión de nuevo." };

  const { data: reto } = await supabase
    .from("retos")
    .select("id")
    .eq("slug", "gastos-hormiga")
    .single<{ id: string }>();
  if (!reto) return { error: "No se encontró este reto." };

  const { data: personaje } = await supabase
    .from("personajes")
    .select("id")
    .eq("usuario_id", user.id)
    .single<{ id: string }>();
  if (!personaje) return { error: "No se encontró tu personaje." };

  const seleccionados = formData.getAll("seleccionados").map(String);
  const puntaje = calcularPuntajeGastosHormiga(seleccionados, items);
  const ahorro = ahorroPorGastosHormigaDetectados(seleccionados, items);

  const resumenSeleccion = items
    .map((item) => `${item.nombre} ($${item.monto.toLocaleString("es-CO")}) — ${seleccionados.includes(item.id) ? "marcado como gasto hormiga" : "no marcado"}`)
    .join("; ");

  const resultadoTutor = await getTutorFeedback({
    retoNombre: "Detecta los gastos hormiga",
    contextoReto:
      "Al estudiante se le mostró una lista de gastos mensuales y debía marcar cuáles son 'gastos hormiga' (pequeños, frecuentes, evitables).",
    decisionEstudiante: `Acertó ${puntaje}% de la lista. Detalle: ${resumenSeleccion}.`,
  });

  if (!resultadoTutor.success) {
    return { error: resultadoTutor.error };
  }

  if (ahorro > 0) {
    await registrarTransaccion(supabase, {
      personajeId: personaje.id,
      tipo: "ingreso",
      monto: ahorro,
      categoria: "ahorro",
      descripcion: "Plata que te ahorraste al detectar gastos hormiga",
      origen: "reto:gastos-hormiga",
    });
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
