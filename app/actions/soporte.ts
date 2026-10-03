"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { esUuid } from "@/lib/utils";
import {
  sanitizarPagina,
  validarMensajeTicket,
  validarTicket,
  type DatosTicket,
} from "@/lib/soporte";
import type { TicketMensaje, TicketSoporte } from "@/types/database";

// Acciones de soporte del USUARIO. Todo pasa por su sesión (RLS): solo crea tickets propios,
// solo ve los suyos y responde mediante la función responder_ticket de la base de datos, que
// vuelve a verificar propiedad y estado. El usuario nunca puede cambiar estado/prioridad/asignación.

export type TicketResumen = Pick<
  TicketSoporte,
  "id" | "asunto" | "categoria" | "estado" | "prioridad" | "creado_en" | "actualizado_en"
>;

export interface DetalleTicket {
  ticket: TicketSoporte;
  mensajes: TicketMensaje[];
}

async function contextoUsuario() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("activo")
    .eq("id", user.id)
    .single<{ activo: boolean }>();
  if (!perfil?.activo) return null;
  return { supabase, userId: user.id };
}

export async function crearTicket(
  datos: DatosTicket,
): Promise<{ success: boolean; error?: string; id?: string }> {
  const ctx = await contextoUsuario();
  if (!ctx)
    return { success: false, error: "Tu sesión expiró. Inicia sesión de nuevo." };

  const normalizados: DatosTicket = {
    asunto: String(datos?.asunto ?? ""),
    categoria: String(datos?.categoria ?? ""),
    descripcion: String(datos?.descripcion ?? ""),
    prioridad: String(datos?.prioridad ?? ""),
    pagina: String(datos?.pagina ?? ""),
  };
  const error = validarTicket(normalizados);
  if (error) return { success: false, error };

  const { data, error: errorInsert } = await ctx.supabase
    .from("tickets_soporte")
    .insert({
      asunto: normalizados.asunto.trim(),
      categoria: normalizados.categoria,
      descripcion: normalizados.descripcion.trim(),
      prioridad: normalizados.prioridad,
      pagina: sanitizarPagina(normalizados.pagina),
    })
    .select("id")
    .single<{ id: string }>();

  if (errorInsert || !data)
    return {
      success: false,
      error: "No se pudo enviar tu solicitud. Intenta de nuevo en un momento.",
    };
  return { success: true, id: data.id };
}

export async function listarMisTickets(): Promise<TicketResumen[]> {
  const ctx = await contextoUsuario();
  if (!ctx) return [];
  const { data } = await ctx.supabase
    .from("tickets_soporte")
    .select("id, asunto, categoria, estado, prioridad, creado_en, actualizado_en")
    .eq("usuario_id", ctx.userId) // filtro explícito: un administrador vería todos por RLS
    .order("actualizado_en", { ascending: false })
    .limit(50);
  return (data ?? []) as TicketResumen[];
}

export async function obtenerMiTicket(
  ticketId: string,
): Promise<DetalleTicket | null> {
  const ctx = await contextoUsuario();
  if (!ctx || !esUuid(String(ticketId ?? ""))) return null;

  const { data: ticket } = await ctx.supabase
    .from("tickets_soporte")
    .select("*")
    .eq("id", ticketId)
    .eq("usuario_id", ctx.userId)
    .maybeSingle<TicketSoporte>();
  if (!ticket) return null;

  const { data: mensajes } = await ctx.supabase
    .from("tickets_mensajes")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("creado_en", { ascending: true })
    .limit(200);

  return { ticket, mensajes: (mensajes ?? []) as TicketMensaje[] };
}

export async function responderMiTicket(
  ticketId: string,
  mensaje: string,
): Promise<{ success: boolean; error?: string }> {
  const ctx = await contextoUsuario();
  if (!ctx || !esUuid(String(ticketId ?? "")))
    return { success: false, error: "Ticket no encontrado." };
  const error = validarMensajeTicket(String(mensaje ?? ""));
  if (error) return { success: false, error };

  // Verificación de propiedad y de estado dentro de la función SQL (SECURITY DEFINER).
  const { error: errorRpc } = await ctx.supabase.rpc("responder_ticket", {
    p_ticket_id: ticketId,
    p_mensaje: String(mensaje).trim(),
  });
  if (errorRpc)
    return {
      success: false,
      error: errorRpc.message.includes("cerrado")
        ? "Este ticket está cerrado."
        : "No se pudo enviar tu respuesta.",
    };
  return { success: true };
}
