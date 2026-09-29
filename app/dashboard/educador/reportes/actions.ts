"use server";

import { revalidatePath } from "next/cache";
import { requireEducador } from "@/lib/educacion-server";
import {
  obtenerEstudiantesEducador,
  resumirDatosEducativos,
} from "@/lib/educacion";
import { generarSugerenciaEducativa } from "@/lib/ai/prompts/educador";
import { sanitizarTextoIA } from "@/lib/primer-empleo";
import type { InformeIAEducativa } from "@/lib/ai/schemas/educador";

export interface ReporteEducativoState {
  error?: string;
  reporte?: {
    periodo: string;
    curso: string | null;
    estudianteId: string | null;
    observados: ReturnType<typeof resumirDatosEducativos>;
    ia: InformeIAEducativa;
  };
}

export async function generarReporteEducativo(
  _prevState: ReporteEducativoState,
  formData: FormData,
): Promise<ReporteEducativoState> {
  const { supabase, usuarioId, colegioId } = await requireEducador();
  const periodo = sanitizarTextoIA(String(formData.get("periodo") ?? ""), 40);
  const cursoSolicitado = sanitizarTextoIA(
    String(formData.get("curso") ?? ""),
    30,
  );
  const estudianteId =
    String(formData.get("estudiante_id") ?? "").trim() || null;
  if (!periodo || periodo.length > 40)
    return { error: "Indica un periodo de hasta 40 caracteres." };

  const { estudiantes, error } = await obtenerEstudiantesEducador(supabase);
  if (error) return { error };
  const estudiante = estudianteId
    ? estudiantes.find((item) => item.estudiante_id === estudianteId)
    : null;
  if (estudianteId && !estudiante) {
    return {
      error: "El estudiante no pertenece al grupo educativo disponible.",
    };
  }

  const curso = estudiante?.curso ?? (cursoSolicitado || null);
  const alcance = estudiante
    ? [estudiante]
    : curso
      ? estudiantes.filter((item) => item.curso === curso)
      : estudiantes;
  if (alcance.length === 0)
    return { error: "No hay datos educativos para ese periodo o grupo." };

  const observados = resumirDatosEducativos(alcance, curso);
  const resultadoIA = await generarSugerenciaEducativa(observados);
  if (!resultadoIA.success) return { error: resultadoIA.error };

  const informePersistido = {
    observacion: resultadoIA.informe.observacion,
    fortalezas: resultadoIA.informe.fortalezas,
    aspectos_por_reforzar: resultadoIA.informe.aspectos_por_reforzar,
    recomendaciones: resultadoIA.informe.recomendaciones,
    actividades_sugeridas: resultadoIA.informe.actividades_sugeridas,
  };
  const { error: errorGuardar } = await supabase
    .from("informes_educativos")
    .insert({
      educador_id: usuarioId,
      colegio_id: colegioId,
      estudiante_id: estudiante?.estudiante_id ?? null,
      curso,
      periodo,
      datos_observados: observados,
      recomendaciones_ia: informePersistido,
    });
  if (errorGuardar) return { error: "No se pudo guardar el reporte." };

  revalidatePath("/dashboard/educador/reportes");
  return {
    reporte: {
      periodo,
      curso,
      estudianteId: estudiante?.estudiante_id ?? null,
      observados,
      ia: resultadoIA.informe,
    },
  };
}

export interface PreguntaEducativaState {
  error?: string;
  respuesta?: InformeIAEducativa;
}

export async function preguntarIAEducativa(
  _prevState: PreguntaEducativaState,
  formData: FormData,
): Promise<PreguntaEducativaState> {
  const { supabase } = await requireEducador();
  const pregunta = sanitizarTextoIA(
    String(formData.get("pregunta") ?? ""),
    500,
  );
  if (pregunta.length < 12)
    return { error: "Formula una pregunta pedagógica más concreta." };

  const { estudiantes, error } = await obtenerEstudiantesEducador(supabase);
  if (error) return { error };
  const estudianteId = String(formData.get("estudiante_id") ?? "").trim();
  const estudiante = estudianteId
    ? estudiantes.find((item) => item.estudiante_id === estudianteId)
    : null;
  if (estudianteId && !estudiante)
    return { error: "No se encontró ese estudiante en tu colegio." };

  const seleccionados = estudiante ? [estudiante] : estudiantes;
  if (seleccionados.length === 0)
    return { error: "No hay datos educativos para consultar." };

  const resultado = await generarSugerenciaEducativa(
    resumirDatosEducativos(seleccionados, estudiante?.curso ?? null),
    pregunta,
  );
  return resultado.success
    ? { respuesta: resultado.informe }
    : { error: resultado.error };
}
