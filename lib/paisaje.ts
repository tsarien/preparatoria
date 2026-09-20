/**
 * Ciclo del paisaje de fondo (portada, login, registro) — independiente del
 * modo claro/oscuro de la interfaz (ver lib/theme.ts). Uno es ambientación
 * atada a la hora real en Colombia; el otro es una preferencia de lectura que
 * elige el usuario. No dependen entre sí a propósito.
 *
 * 5 franjas, con límites que no coinciden con horas redondas a propósito
 * (el amanecer y el atardecer son más angostos que el resto, para que no se
 * sientan instantáneos al entrar a la app justo en esa ventana).
 */

export type MomentoDia = "amanecer" | "manana" | "mediodia" | "atardecer" | "noche";

const LIMITES: { desde: number; momento: MomentoDia }[] = [
  { desde: 4 * 60 + 30, momento: "amanecer" }, // 4:30
  { desde: 7 * 60, momento: "manana" }, // 7:00
  { desde: 11 * 60, momento: "mediodia" }, // 11:00
  { desde: 16 * 60, momento: "atardecer" }, // 16:00
  { desde: 19 * 60, momento: "noche" }, // 19:00 (envuelve hasta las 4:29 del día siguiente)
];

/**
 * Minutos transcurridos desde la medianoche (0-1439) en horario de Colombia
 * (America/Bogota), sin depender de la zona horaria del servidor. Colombia no
 * tiene horario de verano — por eso esto no necesita ajuste estacional.
 */
export function minutosDelDiaColombia(fecha: Date = new Date()): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const partes = formatter.formatToParts(fecha);
  const hora = Number(partes.find((p) => p.type === "hour")?.value ?? "0");
  const minuto = Number(partes.find((p) => p.type === "minute")?.value ?? "0");
  const horaNormalizada = hora === 24 ? 0 : hora; // algunos entornos devuelven "24" para medianoche
  return horaNormalizada * 60 + minuto;
}

/**
 * A qué franja del día corresponde un momento determinado, dado en minutos
 * desde la medianoche (0-1439).
 *
 * Amanecer   4:30 – 6:59
 * Mañana     7:00 – 10:59
 * Mediodía   11:00 – 15:59
 * Atardecer  16:00 – 18:59
 * Noche      19:00 – 4:29 (envuelve la medianoche)
 */
export function momentoDelDia(minutosDelDia: number): MomentoDia {
  if (!Number.isInteger(minutosDelDia) || minutosDelDia < 0 || minutosDelDia > 1439) {
    throw new Error("minutosDelDia debe ser un entero entre 0 y 1439");
  }
  // Recorrido en reversa: el último límite que ya "pasó" define el momento
  // actual — así el envolvimiento de "noche" alrededor de la medianoche no
  // necesita un caso especial.
  for (let i = LIMITES.length - 1; i >= 0; i--) {
    if (minutosDelDia >= LIMITES[i].desde) return LIMITES[i].momento;
  }
  return "noche"; // antes de las 4:30 (antes del primer límite) sigue siendo de noche
}

/** Atajo: el momento del día ahora mismo, en Colombia. */
export function momentoActualColombia(fecha: Date = new Date()): MomentoDia {
  return momentoDelDia(minutosDelDiaColombia(fecha));
}
