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

export function esAvatarValido(avatarId: string): avatarId is AvatarId {
  return AVATARES.some((avatar) => avatar.id === avatarId);
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
