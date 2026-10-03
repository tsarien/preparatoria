// Validación de cursos contra la lista configurada por el administrador para el colegio.
// Las listas "disponibles" SIEMPRE se leen de la base de datos (cursos_colegio), nunca del cliente.

export const MAX_CURSOS_EDUCADOR = 10;

function clave(nombre: string): string {
  return nombre.trim().toLowerCase();
}

export function normalizarSeleccion(valores: string[]): string[] {
  const vistos = new Set<string>();
  const resultado: string[] = [];
  for (const valor of valores) {
    const limpio = valor.trim();
    if (limpio && !vistos.has(clave(limpio))) {
      vistos.add(clave(limpio));
      resultado.push(limpio);
    }
  }
  return resultado;
}

/** Devuelve los cursos con el nombre canónico de la BD, o error si alguno no pertenece al colegio. */
export function validarCursosDelColegio(
  seleccion: string[],
  disponibles: string[],
): { cursos: string[]; error?: string } {
  const elegidos = normalizarSeleccion(seleccion);
  if (elegidos.length === 0)
    return { cursos: [], error: "Selecciona al menos un curso." };
  if (elegidos.length > MAX_CURSOS_EDUCADOR)
    return {
      cursos: [],
      error: `Puedes seleccionar máximo ${MAX_CURSOS_EDUCADOR} cursos.`,
    };
  const porClave = new Map(disponibles.map((nombre) => [clave(nombre), nombre]));
  const canonicos: string[] = [];
  for (const curso of elegidos) {
    const canonico = porClave.get(clave(curso));
    if (!canonico)
      return { cursos: [], error: "Algún curso no pertenece al colegio seleccionado." };
    canonicos.push(canonico);
  }
  return { cursos: canonicos };
}

/** Curso del estudiante: debe pertenecer al colegio si éste tiene cursos configurados; si no, debe ir vacío. */
export function validarCursoEstudiante(
  curso: string,
  disponibles: string[],
): { curso: string; error?: string } {
  const limpio = curso.trim();
  if (disponibles.length === 0) return { curso: "" };
  if (!limpio) return { curso: "", error: "Selecciona tu curso." };
  const canonico = disponibles.find((nombre) => clave(nombre) === clave(limpio));
  return canonico
    ? { curso: canonico }
    : { curso: "", error: "El curso no pertenece al colegio seleccionado." };
}
