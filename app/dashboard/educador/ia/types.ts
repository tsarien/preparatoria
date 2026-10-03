import type { InformeIAEducativa } from "@/lib/ai/schemas/educador";

// Tipos compartidos entre las acciones ("use server") y la interfaz del chat educativo.

export interface ConversacionEducativaResumen {
  id: string;
  titulo: string;
  actualizado_en: string;
}

export interface MensajeEducativoVista {
  id: string;
  autor: "educador" | "ia";
  texto: string;
  /** Informe estructurado de la IA (para mostrarlo con secciones), si lo hay. */
  informe: InformeIAEducativa | null;
  creado_en: string;
}

export interface EstadoIAEducativa {
  conversacionId: string | null;
  mensajes: MensajeEducativoVista[];
  conversaciones: ConversacionEducativaResumen[];
}

export interface ConsultaEducativaResultado {
  success: boolean;
  error?: string;
  conversacionId?: string;
  titulo?: string;
  /** Pregunta y respuesta recién guardadas, en orden. */
  mensajes?: MensajeEducativoVista[];
}

export const MAX_MENSAJES_EDUCATIVOS_CARGADOS = 100;
