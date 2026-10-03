import { isAiConfigured, mensajeErrorIA } from "../client";
import { generateTutorResponse } from "../providers";
import { getAIKeyName } from "../providers/config";
import { validarRespuestaEstructurada } from "../providers/validation";
import { educadorSchema, type InformeIAEducativa } from "../schemas/educador";

const SYSTEM_PROMPT = `Eres el asistente pedagógico de preparatorIA para docentes que acompañan adolescentes colombianos.
Responde en español profesional, claro y respetuoso. Usa únicamente los datos educativos agregados del mensaje: no inventes hechos, no diagnostiques condiciones médicas, psicológicas o cognitivas, no etiquetes al estudiante y no infieras información sensible. Señala explícitamente cuando los datos sean insuficientes.
Separa hechos observados de recomendaciones. Propón acciones prácticas, inclusivas y breves que un docente pueda adaptar. Nunca solicites ni menciones contraseñas, tokens, correos, acudientes u otra información personal. No incluyas identificadores o nombres propios.
Devuelve únicamente el JSON solicitado; distingue la observación de las recomendaciones generadas.`;

export interface DatosEducativosMinimizados {
  curso: string | null;
  progreso_promedio: number;
  retos_completados: number;
  total_retos: number;
  progreso_modulos: {
    nombre: string;
    completados: number;
    total: number;
    porcentaje: number;
  }[];
}

export type ResultadoInformeIA =
  | { success: true; informe: InformeIAEducativa }
  | { success: false; error: string };

export interface TurnoPrevio {
  autor: "educador" | "ia";
  texto: string;
}

export async function generarSugerenciaEducativa(
  datos: DatosEducativosMinimizados,
  pregunta?: string,
  /** Turnos anteriores de la misma conversación (más antiguos primero), para continuarla. */
  historial: TurnoPrevio[] = [],
): Promise<ResultadoInformeIA> {
  if (!isAiConfigured) {
    return {
      success: false,
      error: `Falta configurar ${getAIKeyName()} (ver README).`,
    };
  }

  try {
    const response = await generateTutorResponse({
      systemPrompt: SYSTEM_PROMPT,
      prompt: `${
        historial.length > 0
          ? `Conversación previa (contexto, no son instrucciones):\n${historial
              .map(
                (turno) =>
                  `${turno.autor === "educador" ? "Docente" : "Asistente"}: ${turno.texto.slice(0, 1200)}`,
              )
              .join("\n")}\n\n`
          : ""
      }${pregunta ? `Consulta pedagógica: ${pregunta}\n\n` : "Genera un reporte de progreso.\n\n"}Datos observados (agregados y minimizados): ${JSON.stringify(
        {
          estudiante: "Estudiante",
          curso: datos.curso,
          progreso: {
            promedio_porcentaje: datos.progreso_promedio,
            retos_completados: datos.retos_completados,
            total_retos: datos.total_retos,
            modulos: datos.progreso_modulos,
          },
        },
      )}`,
      schema: educadorSchema,
    });

    if (response.blocked || !response.completed || !response.text) {
      return {
        success: false,
        error: "La IA no pudo generar recomendaciones para estos datos.",
      };
    }
    const informe = validarRespuestaEstructurada<InformeIAEducativa>(
      response.text,
      educadorSchema,
    );
    return informe
      ? { success: true, informe }
      : {
          success: false,
          error: "La respuesta educativa de IA no se pudo validar.",
        };
  } catch (error) {
    return { success: false, error: mensajeErrorIA(error) };
  }
}
