import { createHash, randomInt } from "node:crypto";

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

// Sin caracteres ambiguos (0/O, 1/I/L) para que el código se pueda dictar o copiar sin errores.
const ALFABETO_CODIGO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/**
 * Código de invitación para un educador: 12 caracteres aleatorios (≈ 60 bits) con guiones
 * "XXXX-XXXX-XXXX", generados con crypto.randomInt (sin sesgo). Se muestra al administrador UNA
 * sola vez; en la base de datos solo queda su hash SHA-256 (hashCodigoInvitacion).
 */
export function generarCodigoInvitacion(): string {
  const caracteres = Array.from(
    { length: 12 },
    () => ALFABETO_CODIGO[randomInt(ALFABETO_CODIGO.length)],
  );
  return [0, 4, 8].map((i) => caracteres.slice(i, i + 4).join("")).join("-");
}
