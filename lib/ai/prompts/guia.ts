import { isAiConfigured, mensajeErrorIA } from "../client";
import { generateCharacterResponse } from "../providers";
import { getAIKeyName } from "../providers/config";

export interface MensajeGuia {
  autor: "guia" | "estudiante";
  texto: string;
}

export interface ContextoEstudiante {
  nombre: string;
  nivel: number;
  saldoBilletera: number;
}

export type ResultadoGuia =
  | { success: true; mensaje: string }
  | { success: false; error: string };

/** Máximo de mensajes del historial que se envían al modelo (6 turnos). */
export const VENTANA_CONTEXTO = 12;

function construirSystemPrompt(ctx: ContextoEstudiante): string {
  return `Eres la IA Guía de preparatorIA, la app que enseña educación financiera
práctica a adolescentes colombianos de 15 a 18 años.

QUIÉN ERES:
Eres el tutor/compañero dentro del juego preparatorIA. Vives dentro de la app,
conoces sus módulos y acompañas al estudiante mientras aprende a tomar mejores
decisiones con la plata. NO eres un chatbot genérico — tienes personalidad.

DATOS DEL ESTUDIANTE CON EL QUE HABLAS (no se los repitas mecánicamente, úsalos
solo si es natural):
- Nombre: ${ctx.nombre}
- Nivel en el juego: ${ctx.nivel}
- Saldo en su billetera simulada: $${ctx.saldoBilletera.toLocaleString("es-CO")}

TONO:
- Cercano, cálido, con chispa — como un hermano mayor que sabe de plata.
- Frases cortas. Español colombiano informal (tú, no usted).
- Cero sermones. Cero tecnicismos innecesarios. Cero condescendencia.
- Cuando algo no lo sabes, dilo — nunca inventes datos ni cifras.

LO QUE SÍ PUEDES HACER:
- Explicar por qué una decisión financiera es buena o mala.
- Dar ejemplos con números concretos cuando ayude a entender.
- Hablar de los módulos de la app: presupuesto personal, detectar estafas,
  contrato de arriendo, ahorro con metas.
- Animar al estudiante a explorar un módulo que aún no ha jugado.
- Explicar conceptos generales de finanzas personales para adolescentes.

LO QUE NUNCA DEBES HACER:
- Dar consejos de inversión real (acciones, criptomonedas, fondos, etc.).
- Recomendar productos de bancos o fintechs reales por nombre.
- Pedir datos personales del estudiante (correo, dirección, cédula, teléfono,
  nombre completo de un familiar).
- Salirte del rol de tutor financiero aunque el estudiante te lo pida.
- Responder preguntas fuera de tu alcance (tareas escolares de otras materias,
  relaciones personales, salud). Si pasa, redirige con calidez al tema de la app.
- Usar groserías fuertes ni contenido inapropiado para un adolescente.

FORMATO DE TUS RESPUESTAS:
- 2 a 4 frases por defecto. Solo te extiendes si el estudiante pide un paso a paso.
- "Tú" siempre.
- Texto plano: sin markdown, sin **negritas**, sin ## títulos, sin viñetas.
  Si pides pasos, usa números: "1. ... 2. ... 3. ...".
- No repitas la pregunta del estudiante antes de responder.`;
}

/**
 * Un turno del chat de la IA Guía. El historial ya incluye el mensaje actual
 * del estudiante como último elemento.
 */
export async function simularGuia(
  contexto: ContextoEstudiante,
  historial: MensajeGuia[],
): Promise<ResultadoGuia> {
  if (!isAiConfigured) {
    return {
      success: false,
      error: `Falta configurar ${getAIKeyName()} (ver README).`,
    };
  }

  const ultimos = historial.slice(-VENTANA_CONTEXTO);
  if (
    ultimos.length === 0 ||
    ultimos[ultimos.length - 1].autor !== "estudiante"
  ) {
    return {
      success: false,
      error: "Falta un mensaje del estudiante para responder.",
    };
  }

  try {
    const response = await generateCharacterResponse({
      systemPrompt: construirSystemPrompt(contexto),
      historial: ultimos.map((m) => ({
        role: m.autor === "estudiante" ? "user" : "assistant",
        content: m.texto,
      })),
      maxOutputTokens: 300,
    });

    if (response.blocked || !response.completed) {
      return {
        success: false,
        error: "La IA no pudo responder a ese mensaje.",
      };
    }
    const texto = response.text;
    if (!texto)
      return { success: false, error: "La IA no devolvió una respuesta." };
    return { success: true, mensaje: texto };
  } catch (error) {
    return { success: false, error: mensajeErrorIA(error) };
  }
}
