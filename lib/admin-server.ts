import "server-only";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

/**
 * AUTORIZACIÓN DEL ADMINISTRADOR (solo servidor).
 *
 * Toda página y toda Server Action administrativa debe pasar por aquí. Se verifica en el
 * servidor, contra la sesión de Supabase (auth.getUser valida el JWT con el servidor de Auth)
 * y contra public.perfiles.rol — jamás contra props, cookies propias, localStorage ni campos
 * ocultos del formulario. La service-role key solo se usa DESPUÉS de esta verificación y nunca
 * llega al navegador (este archivo es "server-only").
 */

export interface ContextoAdmin {
  /** Cliente con la sesión del administrador (aplica RLS). */
  supabase: SupabaseClient<Database>;
  usuarioId: string;
  nombre: string;
}

/** Devuelve el contexto si la sesión actual es de un administrador activo; si no, null. */
export async function autorizarAdmin(): Promise<ContextoAdmin | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol, activo, nombre")
    .eq("id", user.id)
    .single<{ rol: string; activo: boolean; nombre: string }>();

  if (!perfil || perfil.rol !== "administrador" || !perfil.activo) return null;
  return { supabase, usuarioId: user.id, nombre: perfil.nombre };
}

/** Para páginas: redirige si no es administrador. */
export async function requireAdmin(): Promise<ContextoAdmin> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const contexto = await autorizarAdmin();
  if (!contexto) redirect("/dashboard");
  return contexto;
}

/** Cliente con service-role. Solo usar tras autorizarAdmin()/requireAdmin(). */
export function obtenerClienteServicio(): SupabaseClient<Database> {
  const cliente = createSupabaseAdminClient();
  if (!cliente) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY: las operaciones administrativas requieren el acceso seguro de Supabase.",
    );
  }
  return cliente;
}

export interface EventoActividad {
  actorId: string;
  accion: string;
  entidad: string;
  entidadId?: string | null;
  /** Texto corto sin datos sensibles (nunca contraseñas, códigos ni tokens). */
  detalle?: string | null;
}

/** Registra una acción administrativa en actividad_sistema (auditoría básica). */
export async function registrarActividad(
  servicio: SupabaseClient<Database>,
  evento: EventoActividad,
): Promise<void> {
  await servicio.from("actividad_sistema").insert({
    actor_id: evento.actorId,
    accion: evento.accion.slice(0, 60),
    entidad: evento.entidad.slice(0, 40),
    entidad_id: evento.entidadId ? String(evento.entidadId).slice(0, 80) : null,
    detalle: evento.detalle ? evento.detalle.slice(0, 200) : null,
  });
}
