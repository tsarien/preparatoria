import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { POR_PAGINA } from "@/lib/admin";
import type { Database } from "@/types/database";

// Lecturas del panel de administración. Reciben el cliente con service-role que crea la página
// DESPUÉS de requireAdmin(); no hacen autorización por sí mismas.

type Servicio = SupabaseClient<Database>;

export interface FilaCuenta {
  id: string;
  nombre: string;
  rol: string;
  activo: boolean;
  colegio_id: string | null;
  curso: string | null;
  cargo_educativo: string | null;
  area_educativa: string | null;
  cursos_educativos: string[] | null;
  consentimiento_acudiente: string;
  creado_en: string;
}

const COLUMNAS_CUENTA =
  "id, nombre, rol, activo, colegio_id, curso, cargo_educativo, area_educativa, cursos_educativos, consentimiento_acudiente, creado_en";

export async function contarResumen(servicio: Servicio) {
  const contar = (tabla: "colegios" | "perfiles" | "tickets_soporte" | "invitaciones_educador") =>
    servicio.from(tabla).select("id", { count: "exact", head: true });
  const [colegios, estudiantes, educadores, ticketsAbiertos, ticketsTotal, invitaciones, inactivas] =
    await Promise.all([
      contar("colegios").eq("activo", true),
      contar("perfiles").eq("rol", "estudiante"),
      contar("perfiles").eq("rol", "educador"),
      contar("tickets_soporte").in("estado", ["abierto", "en_proceso"]),
      contar("tickets_soporte"),
      contar("invitaciones_educador")
        .is("usada_en", null)
        .is("revocada_en", null)
        .gt("expira_en", new Date().toISOString()),
      contar("perfiles").eq("activo", false),
    ]);
  return {
    colegios: colegios.count ?? 0,
    estudiantes: estudiantes.count ?? 0,
    educadores: educadores.count ?? 0,
    ticketsAbiertos: ticketsAbiertos.count ?? 0,
    ticketsTotal: ticketsTotal.count ?? 0,
    invitacionesVigentes: invitaciones.count ?? 0,
    cuentasInactivas: inactivas.count ?? 0,
  };
}

export async function listarCuentas(
  servicio: Servicio,
  opciones: {
    rol: "estudiante" | "educador";
    q: string;
    colegioId: string;
    curso: string;
    estado: string;
    pagina: number;
  },
): Promise<{ filas: FilaCuenta[]; total: number }> {
  let consulta = servicio
    .from("perfiles")
    .select(COLUMNAS_CUENTA, { count: "exact" })
    .eq("rol", opciones.rol);
  if (opciones.q) consulta = consulta.ilike("nombre", `%${opciones.q}%`);
  if (opciones.colegioId) consulta = consulta.eq("colegio_id", opciones.colegioId);
  if (opciones.curso) {
    consulta =
      opciones.rol === "estudiante"
        ? consulta.eq("curso", opciones.curso)
        : consulta.contains("cursos_educativos", [opciones.curso]);
  }
  if (opciones.estado === "activo") consulta = consulta.eq("activo", true);
  if (opciones.estado === "inactivo") consulta = consulta.eq("activo", false);

  const desde = (opciones.pagina - 1) * POR_PAGINA;
  const { data, count } = await consulta
    .order("creado_en", { ascending: false })
    .range(desde, desde + POR_PAGINA - 1);
  return { filas: (data ?? []) as unknown as FilaCuenta[], total: count ?? 0 };
}

/** Correos desde Supabase Auth (el correo no vive en public.perfiles). */
export async function correosPorId(servicio: Servicio, ids: string[]): Promise<Map<string, string>> {
  const pares = await Promise.all(
    ids.map(async (id) => {
      const { data } = await servicio.auth.admin.getUserById(id);
      return [id, data.user?.email ?? ""] as const;
    }),
  );
  return new Map(pares);
}

export async function listarColegiosSimple(servicio: Servicio, soloActivos = false) {
  let consulta = servicio.from("colegios").select("id, nombre, activo").order("nombre");
  if (soloActivos) consulta = consulta.eq("activo", true);
  const { data } = await consulta;
  return (data ?? []) as { id: string; nombre: string; activo: boolean }[];
}
