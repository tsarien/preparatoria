import { calcularEdadPerfil } from "./perfil";

// Validaciones de registro compartidas por el cliente (UX) y el servidor (seguridad).
// El servidor SIEMPRE vuelve a validar: la validación del navegador es solo ayuda.

export const LONGITUD_MINIMA_PASSWORD = 8;
export const EDAD_MAXIMA_PLAUSIBLE = 120;
const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarCorreo(correo: string): string | null {
  const limpio = correo.trim();
  if (!REGEX_CORREO.test(limpio) || limpio.length > 254)
    return "Escribe un correo válido.";
  return null;
}

export function validarContrasena(
  password: string,
  confirmacion: string,
): string | null {
  if (!password) return "Escribe una contraseña.";
  if (password.length < LONGITUD_MINIMA_PASSWORD)
    return `La contraseña debe tener al menos ${LONGITUD_MINIMA_PASSWORD} caracteres.`;
  if (!confirmacion) return "Confirma tu contraseña.";
  if (password !== confirmacion) return "Las contraseñas no coinciden.";
  return null;
}

/** Devuelve la fecha como Date local si es una fecha real YYYY-MM-DD; si no, null. */
export function parsearFechaNacimiento(fecha: string): Date | null {
  if (!REGEX_FECHA.test(fecha)) return null;
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const date = new Date(anio, mes - 1, dia);
  const coincide =
    date.getFullYear() === anio &&
    date.getMonth() === mes - 1 &&
    date.getDate() === dia;
  return coincide ? date : null;
}

export function validarFechaNacimiento(
  fecha: string,
  hoy = new Date(),
): string | null {
  if (!fecha) return "Indica tu fecha de nacimiento.";
  const date = parsearFechaNacimiento(fecha);
  if (!date) return "La fecha de nacimiento no es válida.";
  if (date.getTime() > hoy.getTime())
    return "La fecha de nacimiento no puede estar en el futuro.";
  if (calcularEdadPerfil(fecha, hoy) > EDAD_MAXIMA_PLAUSIBLE)
    return "La fecha de nacimiento no es válida.";
  return null;
}

export function esMenorDeEdad(fecha: string, hoy = new Date()): boolean {
  if (validarFechaNacimiento(fecha, hoy)) return false;
  return calcularEdadPerfil(fecha, hoy) < 18;
}

/**
 * El correo del acudiente es obligatorio para menores y NO puede ser el del propio
 * estudiante (si lo fuera, el menor podría aprobarse a sí mismo el consentimiento).
 */
export function validarCorreoAcudiente(
  correoAcudiente: string,
  correoEstudiante: string,
): string | null {
  if (!correoAcudiente.trim())
    return "Como eres menor de edad, necesitamos el correo de tu acudiente.";
  const errorFormato = validarCorreo(correoAcudiente);
  if (errorFormato) return "Escribe un correo de acudiente válido.";
  if (
    correoAcudiente.trim().toLowerCase() === correoEstudiante.trim().toLowerCase()
  )
    return "El correo del acudiente debe ser distinto al tuyo.";
  return null;
}
