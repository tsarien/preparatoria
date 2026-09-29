export const RETOS_PRIMER_EMPLEO = [
  { slug: "hoja-de-vida", nombre: "Crea tu hoja de vida" },
  { slug: "elegir-oferta", nombre: "Elige una oferta" },
  { slug: "oferta-sospechosa", nombre: "Detecta una oferta sospechosa" },
  { slug: "entrevista", nombre: "Practica una entrevista" },
  { slug: "comparar-ofertas", nombre: "Compara tus opciones" },
] as const;

export type RetoPrimerEmpleo = (typeof RETOS_PRIMER_EMPLEO)[number]["slug"];

export interface OfertaLaboral {
  id: string;
  titulo: string;
  salario: number;
  horario: string;
  requisitos: string;
  modalidad: string;
  ubicacion: string;
  beneficios: string;
  aprendizaje: string;
  transporte?: string;
  estabilidad?: string;
}

export interface SenalOfertaLaboral {
  id: string;
  texto: string;
}

export interface ConfigRetoPrimerEmpleo {
  nota?: string;
  escenario?: string;
  campos?: string[];
  ofertas?: OfertaLaboral[];
  oferta?: string;
  senales?: SenalOfertaLaboral[];
  correctas?: string[];
  preguntas?: string[];
}

export const CAMPOS_HOJA_VIDA = [
  {
    id: "perfil",
    label: "Perfil profesional",
    placeholder: "¿Qué te interesa aprender o aportar?",
  },
  {
    id: "habilidades",
    label: "Habilidades",
    placeholder: "Organización, comunicación, herramientas que manejas...",
  },
  {
    id: "educacion",
    label: "Educación",
    placeholder: "Nivel o área de estudio, sin nombrar tu colegio",
  },
  {
    id: "experiencia_proyectos",
    label: "Proyectos, voluntariados o experiencia",
    placeholder: "Un proyecto académico o personal también cuenta",
  },
  { id: "idiomas", label: "Idiomas", placeholder: "Idioma y nivel aproximado" },
] as const;

export function esRetoPrimerEmpleo(slug: string): slug is RetoPrimerEmpleo {
  return RETOS_PRIMER_EMPLEO.some((reto) => reto.slug === slug);
}

export function calcularCompletitud(respuestas: string[]): number {
  if (respuestas.length === 0) return 0;
  const completas = respuestas.filter(
    (respuesta) => respuesta.trim().length >= 3,
  );
  return Math.round((completas.length / respuestas.length) * 100);
}

export function calcularPuntajeSenales(
  seleccionadas: string[],
  correctas: string[],
): number {
  if (correctas.length === 0 || seleccionadas.length === 0) return 0;

  const correctasSet = new Set(correctas);
  const seleccionadasUnicas = new Set(seleccionadas);
  const aciertos = [...seleccionadasUnicas].filter((senal) =>
    correctasSet.has(senal),
  ).length;
  const precision = aciertos / seleccionadasUnicas.size;
  const cobertura = aciertos / correctasSet.size;

  return Math.round(
    (2 * precision * cobertura * 100) / (precision + cobertura),
  );
}

export function esOpcionValida(
  seleccionada: string,
  opciones: string[],
): boolean {
  return opciones.includes(seleccionada);
}

export function sanitizarTextoIA(texto: string, limite = 500): string {
  return texto
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[correo omitido]")
    .replace(
      /(?:\+?57[\s.-]?)?(?:3\d{2}[\s.-]?\d{3}[\s.-]?\d{4}|\d{7,10})/g,
      "[teléfono omitido]",
    )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limite);
}
