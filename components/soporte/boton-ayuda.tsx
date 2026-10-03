"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { ArrowLeft, CircleHelp, LifeBuoy, Send, X } from "lucide-react";
import {
  crearTicket,
  listarMisTickets,
  obtenerMiTicket,
  responderMiTicket,
  type DetalleTicket,
  type TicketResumen,
} from "@/app/actions/soporte";
import { Button } from "@/components/ui/button";
import {
  CATEGORIAS_TICKET,
  LIMITES_TICKET,
  PRIORIDADES_TICKET,
  etiquetaCategoria,
  etiquetaEstado,
  etiquetaPrioridad,
  sanitizarPagina,
} from "@/lib/soporte";
import { cn } from "@/lib/utils";

type Vista = "nuevo" | "lista" | "detalle";

const COLOR_ESTADO: Record<string, string> = {
  abierto: "border-gold/60 bg-gold-soft text-ink",
  en_proceso: "border-primary/50 bg-primary-soft text-primary",
  respondido: "border-turquoise/60 bg-turquoise-soft text-ink",
  cerrado: "border-line bg-paper text-ink-soft",
};

function fecha(iso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Bogota",
  }).format(new Date(iso));
}

const CAMPO =
  "w-full rounded-xl border-2 border-line bg-paper px-3 text-base text-ink outline-none focus-visible:border-primary sm:text-sm";

/**
 * "¿Necesitas ayuda?" global para cualquier usuario autenticado. Botón flotante abajo a la
 * IZQUIERDA (la IA Guía va abajo a la derecha, así no se tapan entre sí ni con la navegación
 * inferior). Crea tickets, lista los propios y permite conversar con soporte.
 */
export function BotonAyuda() {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [vista, setVista] = useState<Vista>("nuevo");
  const [tickets, setTickets] = useState<TicketResumen[] | null>(null);
  const [detalle, setDetalle] = useState<DetalleTicket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const botonRef = useRef<HTMLButtonElement>(null);
  const aperturaPrevia = useRef(false);

  // Campos del formulario de ticket
  const [asunto, setAsunto] = useState("");
  const [categoria, setCategoria] = useState("");
  const [prioridad, setPrioridad] = useState("media");
  const [descripcion, setDescripcion] = useState("");
  const [respuesta, setRespuesta] = useState("");

  const pagina = sanitizarPagina(pathname) ?? "";

  useEffect(() => {
    if (!abierto) return;
    const alPulsar = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [abierto]);

  useEffect(() => {
    if (!abierto && aperturaPrevia.current) botonRef.current?.focus();
    if (abierto) aperturaPrevia.current = true;
  }, [abierto]);

  function cargarLista() {
    startTransition(async () => {
      setTickets(await listarMisTickets());
    });
  }

  function cambiarVista(v: Vista) {
    setError(null);
    setAviso(null);
    setVista(v);
    if (v === "lista") cargarLista();
  }

  function enviarTicket(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await crearTicket({ asunto, categoria, descripcion, prioridad, pagina });
      if (!r.success) {
        setError(r.error ?? "No se pudo enviar tu solicitud.");
        return;
      }
      setAsunto("");
      setCategoria("");
      setPrioridad("media");
      setDescripcion("");
      setAviso("¡Listo! Recibimos tu solicitud. Te responderemos por aquí.");
      setVista("lista");
      setTickets(await listarMisTickets());
    });
  }

  function abrirTicket(id: string) {
    setError(null);
    setAviso(null);
    startTransition(async () => {
      const d = await obtenerMiTicket(id);
      if (!d) {
        setError("No se pudo abrir el ticket.");
        return;
      }
      setDetalle(d);
      setRespuesta("");
      setVista("detalle");
    });
  }

  function enviarRespuesta(e: React.FormEvent) {
    e.preventDefault();
    if (!detalle) return;
    setError(null);
    startTransition(async () => {
      const r = await responderMiTicket(detalle.ticket.id, respuesta);
      if (!r.success) {
        setError(r.error ?? "No se pudo enviar tu respuesta.");
        return;
      }
      setRespuesta("");
      const d = await obtenerMiTicket(detalle.ticket.id);
      if (d) setDetalle(d);
    });
  }

  const pestana = (v: Vista, etiqueta: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={vista === v || (v === "lista" && vista === "detalle")}
      onClick={() => cambiarVista(v)}
      className={cn(
        "min-h-10 flex-1 rounded-lg px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        vista === v || (v === "lista" && vista === "detalle")
          ? "bg-primary-soft text-primary"
          : "text-ink-soft hover:text-ink",
      )}
    >
      {etiqueta}
    </button>
  );

  return (
    <>
      <button
        ref={botonRef}
        type="button"
        onClick={() => setAbierto(true)}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        title="¿Necesitas ayuda?"
        className="game-chip press fixed bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] left-4 z-50 flex h-12 items-center justify-center gap-2 rounded-full border-[3px] border-primary bg-paper-raised px-3 text-sm font-semibold text-ink shadow-[0_4px_0_rgba(108,77,255,0.35),0_8px_20px_rgba(31,36,48,0.18)] transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 motion-reduce:transition-none lg:bottom-6 lg:left-6"
      >
        <CircleHelp className="h-5 w-5 text-primary" aria-hidden="true" />
        <span className="hidden sm:inline">¿Necesitas ayuda?</span>
        <span className="sr-only sm:hidden">¿Necesitas ayuda?</span>
      </button>

      {abierto && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/50 sm:items-center sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Centro de ayuda"
            className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border-[3px] border-primary bg-paper-raised pb-[env(safe-area-inset-bottom)] shadow-2xl sm:rounded-3xl sm:pb-0"
          >
            <div className="flex items-center gap-2 border-b-2 border-line bg-gradient-to-r from-primary-soft via-paper-raised to-gold-soft px-4 py-3">
              <LifeBuoy className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="min-w-0 flex-1 font-display text-lg font-semibold text-ink">
                Centro de ayuda
              </h2>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar centro de ayuda"
                className="press grid h-9 w-9 place-items-center rounded-lg border border-line text-ink-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div role="tablist" aria-label="Soporte" className="flex gap-1 border-b border-line p-2">
              {pestana("nuevo", "Nuevo ticket")}
              {pestana("lista", "Mis tickets")}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {aviso && (
                <p className="mb-3 rounded-xl border border-growth/40 bg-growth-soft p-3 text-sm text-ink" role="status">
                  {aviso}
                </p>
              )}
              {error && (
                <p className="mb-3 text-sm text-alert" role="alert">
                  {error}
                </p>
              )}

              {vista === "nuevo" && (
                <form onSubmit={enviarTicket} className="flex flex-col gap-3">
                  <label className="flex flex-col gap-1 text-sm font-medium text-ink">
                    Asunto
                    <input
                      value={asunto}
                      onChange={(e) => setAsunto(e.target.value)}
                      required
                      minLength={LIMITES_TICKET.asuntoMin}
                      maxLength={LIMITES_TICKET.asuntoMax}
                      className={cn(CAMPO, "h-11")}
                    />
                  </label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1 text-sm font-medium text-ink">
                      Categoría
                      <select
                        value={categoria}
                        onChange={(e) => setCategoria(e.target.value)}
                        required
                        className={cn(CAMPO, "h-11")}
                      >
                        <option value="" disabled>
                          Selecciona
                        </option>
                        {CATEGORIAS_TICKET.map((c) => (
                          <option key={c.valor} value={c.valor}>
                            {c.etiqueta}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-sm font-medium text-ink">
                      Prioridad
                      <select
                        value={prioridad}
                        onChange={(e) => setPrioridad(e.target.value)}
                        className={cn(CAMPO, "h-11")}
                      >
                        {PRIORIDADES_TICKET.map((p) => (
                          <option key={p.valor} value={p.valor}>
                            {p.etiqueta}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="flex flex-col gap-1 text-sm font-medium text-ink">
                    Descripción
                    <textarea
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      required
                      minLength={LIMITES_TICKET.descripcionMin}
                      maxLength={LIMITES_TICKET.descripcionMax}
                      rows={5}
                      className={cn(CAMPO, "resize-y py-2")}
                    />
                    <span className="text-xs font-normal text-ink-soft">
                      {descripcion.length}/{LIMITES_TICKET.descripcionMax}
                    </span>
                  </label>
                  {pagina && (
                    <p className="break-all text-xs text-ink-soft">
                      Página donde ocurrió: <span className="font-mono">{pagina}</span>
                    </p>
                  )}
                  <Button type="submit" disabled={isPending}>
                    <Send className="h-4 w-4" aria-hidden="true" />
                    {isPending ? "Enviando…" : "Enviar ticket"}
                  </Button>
                </form>
              )}

              {vista === "lista" && (
                <>
                  {tickets === null ? (
                    <p className="py-6 text-center text-sm text-ink-soft">Cargando…</p>
                  ) : tickets.length === 0 ? (
                    <p className="py-6 text-center text-sm text-ink-soft">
                      Aún no has creado tickets.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {tickets.map((t) => (
                        <li key={t.id}>
                          <button
                            type="button"
                            onClick={() => abrirTicket(t.id)}
                            disabled={isPending}
                            className="flex w-full flex-col gap-1 rounded-xl border-2 border-line bg-paper p-3 text-left hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
                          >
                            <span className="break-words text-sm font-semibold text-ink">
                              {t.asunto}
                            </span>
                            <span className="flex flex-wrap items-center gap-2 text-[11px] text-ink-soft">
                              <span
                                className={cn(
                                  "rounded-full border px-2 py-0.5 font-semibold",
                                  COLOR_ESTADO[t.estado],
                                )}
                              >
                                {etiquetaEstado(t.estado)}
                              </span>
                              <span>{etiquetaCategoria(t.categoria)}</span>
                              <span>· {fecha(t.actualizado_en)}</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}

              {vista === "detalle" && detalle && (
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => cambiarVista("lista")}
                    className="inline-flex w-fit items-center gap-1 text-sm font-medium text-ink-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Mis tickets
                  </button>
                  <div>
                    <h3 className="break-words font-display text-base font-semibold text-ink">
                      {detalle.ticket.asunto}
                    </h3>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-ink-soft">
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 font-semibold",
                          COLOR_ESTADO[detalle.ticket.estado],
                        )}
                      >
                        {etiquetaEstado(detalle.ticket.estado)}
                      </span>
                      <span>Prioridad {etiquetaPrioridad(detalle.ticket.prioridad).toLowerCase()}</span>
                      <span>· {etiquetaCategoria(detalle.ticket.categoria)}</span>
                    </p>
                  </div>
                  <ul className="flex flex-col gap-2" aria-label="Conversación del ticket">
                    <li className="self-end max-w-[90%] rounded-2xl rounded-br-md bg-ink px-3 py-2 text-sm text-paper">
                      <p className="whitespace-pre-wrap break-words">{detalle.ticket.descripcion}</p>
                      <p className="mt-1 text-[10px] opacity-70">{fecha(detalle.ticket.creado_en)}</p>
                    </li>
                    {detalle.mensajes.map((m) => {
                      const soporte = m.autor_rol === "administrador";
                      return (
                        <li
                          key={m.id}
                          className={cn(
                            "max-w-[90%] rounded-2xl px-3 py-2 text-sm",
                            soporte
                              ? "self-start rounded-bl-md border-2 border-primary/30 bg-primary-soft text-ink"
                              : "self-end rounded-br-md bg-ink text-paper",
                          )}
                        >
                          <p className="text-[10px] font-semibold uppercase opacity-70">
                            {soporte ? "Soporte" : "Tú"}
                          </p>
                          <p className="whitespace-pre-wrap break-words">{m.mensaje}</p>
                          <p className="mt-1 text-[10px] opacity-70">{fecha(m.creado_en)}</p>
                        </li>
                      );
                    })}
                  </ul>
                  {detalle.ticket.estado === "cerrado" ? (
                    <p className="rounded-xl border border-line bg-paper p-3 text-sm text-ink-soft">
                      Este ticket está cerrado. Si necesitas algo más, crea uno nuevo.
                    </p>
                  ) : (
                    <form onSubmit={enviarRespuesta} className="flex flex-col gap-2">
                      <label className="sr-only" htmlFor="respuesta-ticket">
                        Tu respuesta
                      </label>
                      <textarea
                        id="respuesta-ticket"
                        value={respuesta}
                        onChange={(e) => setRespuesta(e.target.value)}
                        required
                        maxLength={LIMITES_TICKET.mensajeMax}
                        rows={3}
                        placeholder="Escribe tu respuesta…"
                        className={cn(CAMPO, "resize-y py-2")}
                      />
                      <Button type="submit" disabled={isPending || !respuesta.trim()}>
                        <Send className="h-4 w-4" aria-hidden="true" />
                        {isPending ? "Enviando…" : "Responder"}
                      </Button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
