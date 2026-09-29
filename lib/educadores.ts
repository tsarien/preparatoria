import { createHash } from "node:crypto";

export const CARGOS_EDUCATIVOS = [
  "Docente",
  "Coordinador académico",
  "Orientador escolar",
  "Directivo",
  "Otro personal educativo",
] as const;

export type CargoEducativo = (typeof CARGOS_EDUCATIVOS)[number];
export type RolAplicacion = "estudiante" | "educador";

export function esCargoEducativo(cargo: string): cargo is CargoEducativo {
  return CARGOS_EDUCATIVOS.some((opcion) => opcion === cargo);
}

export function resolverRolDesdeAppMetadata(rol: unknown): RolAplicacion {
  return rol === "educador" ? "educador" : "estudiante";
}

export function normalizarCursosEducativos(texto: string): string[] {
  return [
    ...new Set(
      texto
        .split(/[;,]/)
        .map((curso) => curso.trim())
        .filter(Boolean),
    ),
  ]
    .filter((curso) => curso.length <= 30)
    .slice(0, 10);
}

export function hashCodigoInvitacion(codigo: string): string {
  return createHash("sha256").update(codigo.trim().toLowerCase()).digest("hex");
}
