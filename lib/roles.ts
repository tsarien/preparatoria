import type { RolPerfil } from "@/types/database";

/** Ruta de inicio según el rol REAL guardado en public.perfiles (nunca user_metadata). */
export function rutaInicioPorRol(rol: string | null | undefined): string {
  if (rol === "administrador") return "/dashboard/admin";
  if (rol === "educador") return "/dashboard/educador";
  return "/dashboard";
}

export const ROLES_PERFIL: readonly RolPerfil[] = [
  "estudiante",
  "educador",
  "administrador",
];

export function esRolPerfil(valor: unknown): valor is RolPerfil {
  return ROLES_PERFIL.some((rol) => rol === valor);
}
