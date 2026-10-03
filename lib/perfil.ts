export const AVATARES = [
  {
    id: "avatar_01",
    etiqueta: "Explorador",
    piel: "#c98561",
    cabello: "#34251f",
    camisa: "#6c4dff",
    cabelloClase: "rounded-t-full",
  },
  {
    id: "avatar_02",
    etiqueta: "Creativa",
    piel: "#f0c4a4",
    cabello: "#3b2b28",
    camisa: "#ffb020",
    cabelloClase: "rounded-t-xl",
  },
  {
    id: "avatar_03",
    etiqueta: "Curioso",
    piel: "#8e543b",
    cabello: "#17151a",
    camisa: "#00b9b0",
    cabelloClase: "rounded-t-full",
  },
  {
    id: "avatar_04",
    etiqueta: "Artista",
    piel: "#e1aa7e",
    cabello: "#57332d",
    camisa: "#e6493c",
    cabelloClase: "rounded-t-lg",
  },
  {
    id: "avatar_05",
    etiqueta: "Inventora",
    piel: "#f2d2b4",
    cabello: "#8d5d2f",
    camisa: "#287bce",
    cabelloClase: "rounded-t-full",
  },
  {
    id: "avatar_06",
    etiqueta: "Estratega",
    piel: "#70432f",
    cabello: "#17151a",
    camisa: "#6c4dff",
    cabelloClase: "rounded-t-lg",
  },
  {
    id: "avatar_07",
    etiqueta: "Lectora",
    piel: "#b97655",
    cabello: "#2b1d1a",
    camisa: "#30a46c",
    cabelloClase: "rounded-t-full",
  },
  {
    id: "avatar_08",
    etiqueta: "Constructor",
    piel: "#f0bb91",
    cabello: "#65452e",
    camisa: "#e08b23",
    cabelloClase: "rounded-t-xl",
  },
] as const;

export type AvatarId = (typeof AVATARES)[number]["id"];

export type AvatarDefinicion = (typeof AVATARES)[number];

export function esAvatarValido(avatarId: string): avatarId is AvatarId {
  return AVATARES.some((avatar) => avatar.id === avatarId);
}

/** Avatar de respaldo cuando el guardado no existe o es inválido. */
export const AVATAR_POR_DEFECTO: AvatarId = "avatar_01";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AVATARES CON IMAGEN — cómo activarlos cuando las imágenes estén listas
 * ─────────────────────────────────────────────────────────────────────────────
 * Hoy los avatares se dibujan con CSS (ver AVATARES arriba y components/avatar-usuario.tsx).
 * El código ya está preparado para usar imágenes reales. Para activarlas:
 *
 *   1. Guarda 8 imágenes en  public/avatares/  con EXACTAMENTE estos nombres:
 *        avatar_01.png  avatar_02.png  avatar_03.png  avatar_04.png
 *        avatar_05.png  avatar_06.png  avatar_07.png  avatar_08.png
 *      (el nombre = el id guardado en public.perfiles.avatar_id; no se cambia la BD).
 *   2. Cambia AVATARES_CON_IMAGEN a `true`.
 *
 * ESPECIFICACIONES DE CADA IMAGEN
 *   · Formato: PNG (WebP también sirve si cambias la extensión en rutaImagenAvatar).
 *   · Tamaño: cuadrado 512 × 512 px (mínimo 256 × 256). Se muestra en círculo de 32 a 80 px.
 *   · Fondo: sólido del color de la camiseta o transparente. Se recorta en círculo con
 *     borde, así que NO dibujes el borde ni dejes elementos importantes en las esquinas.
 *   · Encuadre: busto (cabeza y hombros) centrado, con ~10 % de margen alrededor.
 *   · Estilo: flat / pixel art de preparatorIA, contorno oscuro grueso (#1F2430),
 *     paleta de la marca (#6C4DFF, #FFB020, turquesa), juvenil y no infantil.
 *   · Contenido: personajes FICTICIOS. Nunca fotografías de personas reales ni texto.
 *   · Peso: ≤ 80 KB por imagen (se sirven con next/image y se optimizan solas).
 *   · Orden/personalidad: respeta el orden de AVATARES (etiqueta del 01 al 08).
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const AVATARES_CON_IMAGEN = false;

/** Ruta pública de la imagen de un avatar (solo se usa si AVATARES_CON_IMAGEN es true). */
export function rutaImagenAvatar(avatarId: string): string {
  return `/avatares/${resolverAvatar(avatarId).id}.png`;
}

/**
 * ÚNICO punto que convierte un avatar_id guardado en la definición del avatar.
 * Cualquier id desconocido (null, vacío, inválido) cae en AVATAR_POR_DEFECTO. No dupliques
 * este mapa: HUD, ranking, ajustes y el selector usan este helper.
 */
export function resolverAvatar(
  avatarId: string | null | undefined,
): AvatarDefinicion {
  return (
    AVATARES.find((avatar) => avatar.id === avatarId) ??
    AVATARES.find((avatar) => avatar.id === AVATAR_POR_DEFECTO)!
  );
}

export function validarNombrePerfil(nombre: string): string | null {
  const normalizado = nombre.trim().replace(/\s+/g, " ");
  if (normalizado.length < 2 || normalizado.length > 80) {
    return "El nombre debe tener entre 2 y 80 caracteres.";
  }
  if (!/^[\p{L}\p{M} .'-]+$/u.test(normalizado)) {
    return "El nombre contiene caracteres no permitidos.";
  }
  return null;
}

export function calcularEdadPerfil(
  fechaNacimiento: string,
  hoy = new Date(),
): number {
  const nacimiento = new Date(`${fechaNacimiento}T00:00:00`);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  if (
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() &&
      hoy.getDate() < nacimiento.getDate())
  )
    edad -= 1;
  return edad;
}

export function debeNotificarAcudiente(
  fechaNacimiento: string | null,
  correoAcudiente: string | null,
  hoy = new Date(),
): boolean {
  return Boolean(
    correoAcudiente &&
    fechaNacimiento &&
    calcularEdadPerfil(fechaNacimiento, hoy) < 18,
  );
}
