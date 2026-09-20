"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { registrarTransaccion, otorgarXp } from "@/lib/wallet";
import { getTutorFeedback } from "@/lib/ai/prompts/tutor";
import { validarDistribucion } from "@/lib/presupuesto";
import { guardarProgreso } from "@/lib/retos";
import type { TutorFeedback } from "@/lib/ai/schemas/tutor";

export interface DistribuirSalarioState {
  error?: string;
  feedback?: TutorFeedback;
}

export async function enviarDistribucion(
  categorias: string[],
  _prevState: DistribuirSalarioState,
  formData: FormData
): Promise<DistribuirSalarioState> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "No hay conexión con Supabase." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión expiró. Inicia sesión de nuevo." };

  const { data: reto } = await supabase
    .from("retos")
    .select("id")
    .eq("slug", "distribuir-salario")
    .single<{ id: string }>();
  if (!reto) return { error: "No se encontró este reto." };

  const { data: personaje } = await supabase
    .from("personajes")
    .select("id, salario_mensual")
    .eq("usuario_id", user.id)
    .single<{ id: string; salario_mensual: number }>();
  if (!personaje) return { error: "No se encontró tu personaje." };

  const asignado: Record<string, number> = {};
  for (const categoria of categorias) {
    asignado[categoria] = Number(formData.get(`monto_${categoria}`) ?? 0);
  }

  if (!validarDistribucion(asignado, personaje.salario_mensual)) {
    return {
      error: `Lo que asignaste no cuadra con tu salario ($${personaje.salario_mensual.toLocaleString("es-CO")}). Ajusta los montos para que sumen exacto.`,
    };
  }

  const resultadoTutor = await getTutorFeedback({
    retoNombre: "Distribuye tu primer salario",
    contextoReto: `El estudiante tiene un salario mensual simulado de $${personaje.salario_mensual.toLocaleString("es-CO")} y debe distribuirlo entre las categorías: ${categorias.join(", ")}.`,
    decisionEstudiante: categorias
      .map((c) => `${c}: $${asignado[c].toLocaleString("es-CO")}`)
      .join(", "),
  });

  if (!resultadoTutor.success) {
    return { error: resultadoTutor.error };
  }

  // Conecta con el motor de billetera: el salario entra, y cada categoría sale como gasto real.
  await registrarTransaccion(supabase, {
    personajeId: personaje.id,
    tipo: "ingreso",
    monto: personaje.salario_mensual,
    categoria: "salario",
    descripcion: "Primer salario simulado",
    origen: "reto:distribuir-salario",
  });

  for (const categoria of categorias) {
    if (asignado[categoria] > 0) {
      await registrarTransaccion(supabase, {
        personajeId: personaje.id,
        tipo: "gasto",
        monto: asignado[categoria],
        categoria,
        descripcion: `Presupuesto asignado a ${categoria}`,
        origen: "reto:distribuir-salario",
        permitirNegativo: true, // por diseño la suma ya calza exacto con el ingreso recién registrado
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
