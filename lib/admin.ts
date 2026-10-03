// Lógica pura del panel de administración (sin acceso a la base de datos, fácil de probar).

export const POR_PAGINA = 25;

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface DatosColegio {
  nombre: string;
  ciudad: string;
  codigo: string;
}

export function validarColegio(datos: DatosColegio): string | null {
  const nombre = datos.nombre.trim();
  if (nombre.length < 3 || nombre.length > 120)
    return "El nombre del colegio debe tener entre 3 y 120 caracteres.";
  if (datos.ciudad.trim().length > 80) return "La ciudad no puede superar 80 caracteres.";
  const codigo = datos.codigo.trim();
  if (codigo && !/^[A-Za-z0-9._-]{2,40}$/.test(codigo))
    return "El código institucional solo admite letras, números, punto, guion y guion bajo (2 a 40).";
  return null;
}

/** "10-A, 10-B\n11-A" → ["10-A","10-B","11-A"] (sin duplicados, máx. 30 caracteres cada uno). */
export function parsearListaCursos(texto: string): { cursos: string[]; error?: string } {
  const vistos = new Set<string>();
  const cursos: string[] = [];
  for (const crudo of texto.split(/[\n,;]/)) {
    const curso = crudo.trim().replace(/\s+/g, " ");
    if (!curso) continue;
    if (curso.length > 30)
      return { cursos: [], error: `El curso "${curso.slice(0, 12)}…" supera 30 caracteres.` };
    if (!/^[\p{L}\p{M}\d .'-]+$/u.test(curso))
      return { cursos: [], error: `El curso "${curso}" contiene caracteres no permitidos.` };
    if (!vistos.has(curso.toLowerCase())) {
      vistos.add(curso.toLowerCase());
      cursos.push(curso);
    }
  }
  if (cursos.length === 0) return { cursos: [], error: "Escribe al menos un curso." };
  if (cursos.length > 60) return { cursos: [], error: "Máximo 60 cursos por vez." };
  return { cursos };
}

export const DIAS_VIGENCIA_INVITACION = [3, 7, 14, 30] as const;

export function validarInvitacion(
  correo: string,
  dias: number,
): string | null {
  if (!REGEX_CORREO.test(correo.trim()) || correo.length > 254)
    return "Escribe un correo institucional válido.";
  if (!(DIAS_VIGENCIA_INVITACION as readonly number[]).includes(dias))
    return "Elige una vigencia válida.";
  return null;
}

export type EstadoInvitacion = "vigente" | "usada" | "revocada" | "vencida";

export function estadoInvitacion(
  invitacion: { usada_en: string | null; revocada_en: string | null; expira_en: string },
  ahora = new Date(),
): EstadoInvitacion {
  if (invitacion.usada_en) return "usada";
  if (invitacion.revocada_en) return "revocada";
  return new Date(invitacion.expira_en).getTime() <= ahora.getTime() ? "vencida" : "vigente";
}

export function expiraEn(dias: number, ahora = new Date()): string {
  return new Date(ahora.getTime() + dias * 24 * 60 * 60 * 1000).toISOString();
}

/** Texto de búsqueda seguro para usar dentro de un filtro ilike (quita comodines y separadores). */
export function limpiarBusqueda(q: string | undefined): string {
  return (q ?? "").replace(/[%_,()*\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

export function paginaSegura(valor: string | undefined): number {
  const n = Number.parseInt(valor ?? "1", 10);
  return Number.isFinite(n) && n >= 1 && n <= 10000 ? n : 1;
}

/** Contraseña inicial de cuentas creadas por el administrador (se envía a Supabase Auth; no se guarda). */
export function validarContrasenaInicial(password: string): string | null {
  if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (password.length > 72) return "La contraseña no puede superar 72 caracteres.";
  return null;
}

export function formatearFechaHora(iso: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Bogota",
  }).format(new Date(iso));
}

export function formatearFecha(iso: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Bogota",
  }).format(new Date(iso));
}

export const ETIQUETAS_ACCION: Record<string, string> = {
  colegio_creado: "Colegio creado",
  colegio_editado: "Colegio editado",
  colegio_desactivado: "Colegio desactivado",
  colegio_reactivado: "Colegio reactivado",
  colegio_eliminado: "Colegio eliminado",
  cursos_agregados: "Cursos agregados",
  curso_archivado: "Curso archivado",
  curso_reactivado: "Curso reactivado",
  curso_eliminado: "Curso eliminado",
  invitacion_generada: "Invitación generada",
  invitacion_revocada: "Invitación revocada",
  cuenta_creada: "Cuenta creada",
  cuenta_editada: "Cuenta editada",
  cuenta_desactivada: "Cuenta desactivada",
  cuenta_reactivada: "Cuenta reactivada",
  cuenta_eliminada: "Cuenta eliminada",
  ticket_gestionado: "Ticket gestionado",
};
