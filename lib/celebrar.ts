/**
 * Celebración visual (confeti) para los momentos "buenos" de la app: completar
 * un reto con buen puntaje, llegar a una meta de ahorro, recibir un bono.
 *
 * Es solo presentación — no toca datos ni Server Actions. Vive en `lib/` con la
 * parte pura (`debeCelebrar`) separada de la parte de navegador (`lanzarConfeti`)
 * para poder probar la primera con Vitest sin necesitar un DOM.
 */

/** Desde este puntaje (0-100) un reto cuenta como "buena decisión". Es el mismo
 *  umbral con el que FeedbackCard elige la mascota celebrando. */
export const PUNTAJE_CELEBRACION = 70;

export function debeCelebrar(puntaje: number): boolean {
  return puntaje >= PUNTAJE_CELEBRACION;
}

/**
 * Marca "recién enviado" entre dos pantallas.
 *
 * Hay retos cuya Server Action llama a revalidatePath: al terminar, la página
 * se vuelve a renderizar y el formulario que envió la decisión se desmonta
 * antes de poder mostrar su propia respuesta — la retroalimentación aparece
 * después, ya como "historial" en otro componente. Como ese componente no puede
 * saber por props si la respuesta es de hace un segundo o de ayer, el formulario
 * deja una marca en sessionStorage al enviar y el componente que la muestra la
 * consume una sola vez. La marca vence sola (ventana corta) por si el envío
 * falló y nadie la consumió.
 */
const CLAVE_RECIENTE = "preparatoria-feedback-reciente";
const VENTANA_RECIENTE_MS = 2 * 60 * 1000;

type Almacen = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function almacenPorDefecto(): Almacen | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null; // modo privado estricto / almacenamiento bloqueado
  }
}

export function marcarFeedbackReciente(clave: string, almacen: Almacen | null = almacenPorDefecto()): void {
  try {
    almacen?.setItem(CLAVE_RECIENTE, JSON.stringify({ clave, t: Date.now() }));
  } catch {
    /* sin almacenamiento: simplemente no habrá celebración, nada más */
  }
}

/** true solo una vez por marca, y solo si es de esa `clave` y no está vencida. */
export function consumirFeedbackReciente(
  clave: string,
  almacen: Almacen | null = almacenPorDefecto(),
  ahora: number = Date.now()
): boolean {
  try {
    const crudo = almacen?.getItem(CLAVE_RECIENTE);
    if (!crudo) return false;
    almacen?.removeItem(CLAVE_RECIENTE);
    const marca = JSON.parse(crudo) as { clave?: string; t?: number };
    return marca.clave === clave && typeof marca.t === "number" && ahora - marca.t < VENTANA_RECIENTE_MS;
  } catch {
    return false;
  }
}

// Paleta de marca: primario, acento, el turquesa del logo y blanco.
const COLORES = ["#6c4dff", "#ffb020", "#00d9cc", "#ffffff"];

/**
 * Dispara dos "cañones" de confeti desde las esquinas inferiores. Solo corre en
 * el navegador y respeta prefers-reduced-motion (canvas-confetti dibuja en un
 * <canvas>, así que la regla CSS de globals.css no lo alcanza — hay que
 * cortarlo aquí).
 *
 * `canvas-confetti` se importa dinámicamente: solo se descarga en el momento
 * de celebrar, no pesa en la carga inicial de ninguna página.
 */
export async function lanzarConfeti(intensidad: "normal" | "grande" = "normal"): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const { default: confetti } = await import("canvas-confetti");
  const particulas = intensidad === "grande" ? 90 : 55;
  const base = {
    colors: COLORES,
    disableForReducedMotion: true,
    ticks: 170,
    gravity: 1.1,
    scalar: 0.9,
    spread: 70,
    particleCount: particulas,
  };

  void confetti({ ...base, angle: 60, origin: { x: 0, y: 0.8 } });
  void confetti({ ...base, angle: 120, origin: { x: 1, y: 0.8 } });
}
