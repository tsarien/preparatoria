// Concatena supabase/migrations/*.sql en supabase/setup_completo.sql
// (un solo archivo para pegar en Supabase > SQL Editor). Ejecuta: node scripts/build-setup-sql.mjs
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = "supabase/migrations";
const archivos = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const partes = archivos.map(
  (f) =>
    `-- ════════════════════════════════════════════════════════════\n-- ${f}\n-- ════════════════════════════════════════════════════════════\n${readFileSync(join(dir, f), "utf8").replace(/\r\n/g, "\n").trim()}\n`,
);
const cabecera = `-- preparatorIA — instalación completa (generado; NO editar a mano)
-- Regenerar con: node scripts/build-setup-sql.mjs
-- Contiene ${archivos.length} migraciones en orden. Úsalo en una base vacía (ver supabase/reset_public.sql).
`;
writeFileSync("supabase/setup_completo.sql", `${cabecera}\n${partes.join("\n")}`);
console.log(`supabase/setup_completo.sql generado (${archivos.length} migraciones).`);
