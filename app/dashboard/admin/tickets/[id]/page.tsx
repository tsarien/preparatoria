import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GameModuleShell } from "@/components/game/game-module-shell";
import { Campo, CLASE_CAMPO, EncabezadoAdmin, Insignia } from "@/components/admin/ui";
import { AccionAdmin, FormularioAdmin } from "@/components/admin/formulario-admin";
import { obtenerClienteServicio, requireAdmin } from "@/lib/admin-server";
import { formatearFechaHora } from "@/lib/admin";
import {
  ESTADOS_TICKET,
  LIMITES_TICKET,
  PRIORIDADES_TICKET,
  etiquetaCategoria,
  etiquetaEstado,
  etiquetaPrioridad,
} from "@/lib/soporte";
import { esUuid } from "@/lib/utils";
import { gestionarTicketAdmin, responderTicketAdmin } from "../../actions";
import type { TicketMensaje, TicketSoporte } from "@/types/database";

export default async function AdminTicketPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!esUuid(id)) notFound();
  const servicio = obtenerClienteServicio();

  const { data: ticket } = await servicio
    .from("tickets_soporte")
    .select("*")
    .eq("id", id)
    .maybeSingle<TicketSoporte>();
  if (!ticket) notFound();

  const { data: mensajes } = await servicio
    .from("tickets_mensajes")
    .select("*")
    .eq("ticket_id", id)
    .order("creado_en", { ascending: true })
    .limit(300);
  const mensajesLista = (mensajes ?? []) as TicketMensaje[];

  const ids = [...new Set([ticket.usuario_id, ticket.administrador_asignado_id, ...mensajesLista.map((m) => m.autor_id)].filter(Boolean))] as string[];
  const { data: perfiles } = await servicio.from("perfiles").select("id, nombre, rol").in("id", ids);
  const nombre = new Map((perfiles ?? []).map((p) => [p.id, p]));
  const autor = nombre.get(ticket.usuario_id);
  const asignado = ticket.administrador_asignado_id ? nombre.get(ticket.administrador_asignado_id) : null;

  return (
    <GameModuleShell ancho="estandar">
      <Link
        href="/dashboard/admin/tickets"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-ink-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Tickets
      </Link>
      <EncabezadoAdmin
        etiqueta={`Ticket · ${etiquetaCategoria(ticket.categoria)}`}
        titulo={ticket.asunto}
        descripcion={`${autor?.nombre ?? "Usuario"} (${autor?.rol ?? "—"}) · creado ${formatearFechaHora(ticket.creado_en)}${ticket.pagina ? ` · desde ${ticket.pagina}` : ""}`}
        acciones={
          <>
            <Insignia valor={ticket.estado} etiqueta={etiquetaEstado(ticket.estado)} />
            <Insignia valor={ticket.prioridad} etiqueta={`Prioridad ${etiquetaPrioridad(ticket.prioridad).toLowerCase()}`} />
          </>
        }
      />

      <section aria-label="Conversación" className="game-card flex flex-col gap-3 rounded-2xl bg-paper-raised p-4">
        <ul className="flex flex-col gap-2">
          <li className="max-w-[92%] self-start rounded-2xl rounded-bl-md border-2 border-line bg-paper px-3 py-2 text-sm text-ink">
            <p className="text-[10px] font-semibold uppercase text-ink-soft">{autor?.nombre ?? "Usuario"} · descripción</p>
            <p className="whitespace-pre-wrap break-words">{ticket.descripcion}</p>
            <p className="mt-1 text-[10px] text-ink-soft">{formatearFechaHora(ticket.creado_en)}</p>
          </li>
          {mensajesLista.map((m) => {
            const esAdmin = m.autor_rol === "administrador";
            return (
              <li
                key={m.id}
                className={
                  esAdmin
                    ? "max-w-[92%] self-end rounded-2xl rounded-br-md border-2 border-primary/30 bg-primary-soft px-3 py-2 text-sm text-ink"
                    : "max-w-[92%] self-start rounded-2xl rounded-bl-md border-2 border-line bg-paper px-3 py-2 text-sm text-ink"
                }
              >
                <p className="text-[10px] font-semibold uppercase text-ink-soft">
                  {esAdmin ? `Soporte · ${nombre.get(m.autor_id)?.nombre ?? "Administrador"}` : (nombre.get(m.autor_id)?.nombre ?? "Usuario")}
                </p>
                <p className="whitespace-pre-wrap break-words">{m.mensaje}</p>
                <p className="mt-1 text-[10px] text-ink-soft">{formatearFechaHora(m.creado_en)}</p>
              </li>
            );
          })}
        </ul>

        {ticket.estado === "cerrado" ? (
          <p className="rounded-xl border border-line bg-paper p-3 text-sm text-ink-soft">
            Ticket cerrado. Para responder, reábrelo cambiando el estado.
          </p>
        ) : (
          <FormularioAdmin accion={responderTicketAdmin} etiquetaEnvio="Enviar respuesta">
            <input type="hidden" name="ticket_id" value={ticket.id} />
            <Campo etiqueta="Respuesta">
              <textarea name="mensaje" required rows={4} maxLength={LIMITES_TICKET.mensajeMax} className={`${CLASE_CAMPO} h-auto py-2`} />
            </Campo>
          </FormularioAdmin>
        )}
      </section>

      <section aria-labelledby="gestion" className="game-card flex flex-col gap-4 rounded-2xl bg-paper-raised p-4">
        <h2 id="gestion" className="font-display text-lg font-semibold text-ink">Gestión del ticket</h2>
        <p className="text-sm text-ink-soft">
          Asignado a: <strong>{asignado?.nombre ?? "nadie"}</strong>
        </p>
        <FormularioAdmin accion={gestionarTicketAdmin} etiquetaEnvio="Guardar cambios" reiniciar={false}>
          <input type="hidden" name="ticket_id" value={ticket.id} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Campo etiqueta="Estado">
              <select name="estado" defaultValue={ticket.estado} className={CLASE_CAMPO}>
                {ESTADOS_TICKET.map((e) => <option key={e.valor} value={e.valor}>{e.etiqueta}</option>)}
              </select>
            </Campo>
            <Campo etiqueta="Prioridad">
              <select name="prioridad" defaultValue={ticket.prioridad} className={CLASE_CAMPO}>
                {PRIORIDADES_TICKET.map((p) => <option key={p.valor} value={p.valor}>{p.etiqueta}</option>)}
              </select>
            </Campo>
            <Campo etiqueta="Asignación">
              <select name="asignado" defaultValue="" className={CLASE_CAMPO}>
                <option value="">Sin cambios</option>
                <option value="yo">Asignármelo</option>
                <option value="ninguno">Quitar asignación</option>
              </select>
            </Campo>
          </div>
        </FormularioAdmin>
        {ticket.estado !== "cerrado" && (
          <AccionAdmin
            accion={gestionarTicketAdmin}
            campos={{ ticket_id: ticket.id, estado: "cerrado", prioridad: ticket.prioridad }}
            etiqueta="Cerrar ticket"
            confirmar="¿Cerrar este ticket? El usuario ya no podrá responder."
          />
        )}
      </section>
    </GameModuleShell>
  );
}
