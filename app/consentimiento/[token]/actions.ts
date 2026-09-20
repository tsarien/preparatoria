"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface SolicitudInfo {
  nombreEstudiante: string;
  estado: "pendiente" | "aprobado" | "rechazado";
}

export async function getSolicitud(token: string): Promise<SolicitudInfo | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data } = await supabase.rpc("obtener_solicitud_consentimiento", { p_token: token });
  const fila = (data as { nombre_estudiante: string; estado: string }[] | null)?.[0];
  if (!fila) return null;

  return { nombreEstudiante: fila.nombre_estudiante, estado: fila.estado as SolicitudInfo["estado"] };
}

export interface ResolverConsentimientoState {
  error?: string;
  resultado?: "aprobado" | "rechazado";
}

export async function resolverConsentimientoAction(
  token: string,
  aprobar: boolean
): Promise<ResolverConsentimientoState> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "No hay conexión con Supabase." };

  const { data, error } = await supabase.rpc("resolver_consentimiento", {
    p_token: token,
    p_aprobar: aprobar,
  });

  if (error) return { error: error.message };
  return { resultado: data as "aprobado" | "rechazado" };
}
