"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { registrarTransaccion, otorgarXp } from "@/lib/wallet";
import { getTutorFeedback } from "@/lib/ai/prompts/tutor";
import { validarPresupuesto, totalSeleccionado, type PriorizarGastosItem } from "@/lib/presupuesto";
import { guardarProgreso } from "@/lib/retos";
import type { TutorFeedback } from "@/lib/ai/schemas/tutor";

export interface PriorizarGastosState {
  error?: string;
  feedback?: TutorFeedback;
}

export async function enviarPriorizacion(
  items: PriorizarGastosItem[],
  presupuesto: number,
  _prevState: PriorizarGastosState,
  formData: FormData
): Promise<PriorizarGastosState> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "No hay conexión con Supabase." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión expiró. Inicia sesión de nuevo." };

  const { data: reto } = await supabase
    .from("retos")
    .select("id")
    .eq("slug", "priorizar-gastos")
    .single<{ id: string }>();
  if (!reto) return { error: "No se encontró este reto." };

  const { data: personaje } = await supabase
    .from("personajes")
    .select("id")
    .eq("usuario_id", user.id)
    .single<{ id: string }>();
  if (!personaje) return { error: "No se encontró tu personaje." };

  const seleccionados = formData.getAll("seleccionados").map(String);

  if (!validarPresupuesto(seleccionados, items, presupuesto)) {
    return {
      error: `Lo que elegiste se pasa del presupuesto ($${presupuesto.toLocaleString("es-CO")}). Quita algo de la lista.`,
    };
  }

  const total = totalSeleccionado(seleccionados, items);
  const noElegidos = items.filter((i) => !seleccionados.includes(i.id)).map((i) => i.nombre);
  const elegidos = items.filter((i) => seleccionados.includes(i.id)).map((i) => i.nombre);

  const resultadoTutor = await getTutorFeedback({
    retoNombre: "Prioriza tus gastos",
    contextoReto: `El estudiante tiene $${presupuesto.toLocaleString("es-CO")} extra este mes y una lista de cosas que quiere, que en total suman más de lo que tiene.`,
    decisionEstudiante: `Eligió: ${elegidos.join(", ") || "nada"} (total $${total.toLocaleString("es-CO")}). Dejó por fuera: ${noElegidos.join(", ") || "nada"}.`,
  });

  if (!resultadoTutor.success) {
    return { error: resultadoTutor.error };
  }

  for (const item of items) {
    if (seleccionados.includes(item.id)) {
      await registrarTransaccion(supabase, {
        personajeId: personaje.id,
        tipo: "gasto",
        monto: item.monto,
        categoria: "prioridades",
        descripcion: item.nombre,
        origen: "reto:priorizar-gastos",
        permitirNegativo: true,
      });
    }
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
