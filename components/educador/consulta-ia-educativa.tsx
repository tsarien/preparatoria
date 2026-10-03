"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { MessageSquarePlus, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IndicadorEscribiendo } from "@/components/chat-ui";
import type { EstudianteEducativo } from "@/lib/educacion";
import { PREGUNTA_MAX, PREGUNTA_MIN } from "@/lib/ia-educativa";
import {
  abrirConversacionEducativa,
  borrarConversacionEducativa,
  consultarIAEducativa,
} from "@/app/dashboard/educador/ia/actions";
import type {
  ConversacionEducativaResumen,
  EstadoIAEducativa,
  MensajeEducativoVista,
} from "@/app/dashboard/educador/ia/types";
import { cn } from "@/lib/utils";

function fecha(iso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Bogota",
  }).format(new Date(iso));
}

/**
 * Chat de la IA educativa del educador. Cada conversación se guarda en Supabase
 * (mensajes_ia_educativa), solo la ve su autor y es independiente de la IA Guía.
 */
export function ConsultaIAEducativa({
  estudiantes,
  estadoInicial,
}: {
  estudiantes: EstudianteEducativo[];
  estadoInicial: EstadoIAEducativa;
}) {
  const [conversacionId, setConversacionId] = useState(estadoInicial.conversacionId);
  const [mensajes, setMensajes] = useState<MensajeEducativoVista[]>(estadoInicial.mensajes);
  const [conversaciones, setConversaciones] = useState<ConversacionEducativaResumen[]>(
    estadoInicial.conversaciones,
  );
  const [pregunta, setPregunta] = useState("");
  const [estudianteId, setEstudianteId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const hiloRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    hiloRef.current?.scrollTo({ top: hiloRef.current.scrollHeight, behavior: "smooth" });
  }, [mensajes.length, isPending]);

  function nueva() {
    setConversacionId(null);
    setMensajes([]);
    setError(null);
  }

  function abrir(id: string) {
    setError(null);
    startTransition(async () => {
      const r = await abrirConversacionEducativa(id);
      if (!r) return setError("No se pudo abrir esa conversación.");
      setConversacionId(r.conversacionId);
      setMensajes(r.mensajes);
    });
  }

  function borrar(id: string) {
    if (!window.confirm("¿Borrar esta conversación? Esta acción no se puede deshacer.")) return;
    setError(null);
    startTransition(async () => {
      const r = await borrarConversacionEducativa(id);
      if (!r.success) return setError("No se pudo borrar la conversación.");
      setConversaciones((previas) => previas.filter((c) => c.id !== id));
      if (id === conversacionId) nueva();
    });
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const texto = pregunta.trim();
    if (!texto || isPending) return;
    setError(null);
    startTransition(async () => {
      const r = await consultarIAEducativa(conversacionId, texto, estudianteId || null);
      if (r.conversacionId) {
        setConversacionId(r.conversacionId);
        setConversaciones((previas) => [
          {
            id: r.conversacionId!,
            titulo: r.titulo ?? previas.find((c) => c.id === r.conversacionId)?.titulo ?? "Consulta",
            actualizado_en: new Date().toISOString(),
          },
          ...previas.filter((c) => c.id !== r.conversacionId),
        ]);
      }
      if (r.mensajes?.length) setMensajes((previos) => [...previos, ...r.mensajes!]);
      if (r.success) setPregunta("");
      else setError(r.error ?? "No se pudo completar la consulta.");
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
      {/* Conversaciones */}
      <aside
        aria-label="Conversaciones anteriores"
        className="game-card flex flex-col gap-2 rounded-2xl bg-paper-raised p-3 lg:max-h-[34rem]"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink">
            Conversaciones
          </h2>
          <button
            type="button"
            onClick={nueva}
            disabled={isPending}
            className="press inline-flex min-h-9 items-center gap-1 rounded-lg border border-line px-2.5 text-xs font-semibold text-ink hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden="true" />
            Nueva
          </button>
        </div>
        {conversaciones.length === 0 ? (
          <p className="py-3 text-center text-xs text-ink-soft">
            Aún no tienes conversaciones guardadas.
          </p>
        ) : (
          <ul className="flex max-h-44 flex-col gap-1.5 overflow-y-auto lg:max-h-none">
            {conversaciones.map((c) => (
              <li
                key={c.id}
                className={cn(
                  "flex items-stretch rounded-xl border-2",
                  c.id === conversacionId ? "border-primary bg-primary-soft" : "border-line bg-paper",
                )}
              >
                <button
                  type="button"
                  onClick={() => abrir(c.id)}
                  disabled={isPending}
                  className="min-w-0 flex-1 rounded-l-xl px-2.5 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary disabled:opacity-60"
                >
                  <span className="block truncate text-sm font-semibold text-ink">{c.titulo}</span>
                  <span className="block text-[11px] text-ink-soft">{fecha(c.actualizado_en)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => borrar(c.id)}
                  disabled={isPending}
                  aria-label={`Borrar conversación: ${c.titulo}`}
                  className="grid w-9 shrink-0 place-items-center rounded-r-xl text-ink-soft hover:bg-alert-soft hover:text-alert focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-alert disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Hilo + compositor */}
      <section className="game-card flex min-w-0 flex-col overflow-hidden rounded-2xl bg-paper-raised">
        <div
          ref={hiloRef}
          className="flex max-h-[28rem] min-h-[14rem] flex-col gap-3 overflow-y-auto p-4"
          aria-live="polite"
          aria-label="Conversación con la IA educativa"
        >
          {mensajes.length === 0 && !isPending && (
            <p className="m-auto max-w-sm text-center text-sm text-ink-soft">
              Haz tu primera consulta pedagógica. La IA usa solo el progreso agregado de tu colegio,
              y la conversación quedará guardada para retomarla después.
            </p>
          )}
          {mensajes.map((m) =>
            m.autor === "educador" ? (
              <div
                key={m.id}
                className="max-w-[90%] self-end rounded-2xl rounded-br-md bg-ink px-3.5 py-2 text-sm text-paper"
              >
                <p className="whitespace-pre-wrap break-words">{m.texto}</p>
              </div>
            ) : (
              <article
                key={m.id}
                className="max-w-full self-start rounded-2xl rounded-bl-md border-2 border-turquoise/40 bg-turquoise-soft p-3.5"
              >
                {m.informe ? (
                  <div className="flex flex-col gap-2 text-sm text-ink">
                    <section>
                      <h3 className="font-semibold">Observación</h3>
                      <p className="mt-0.5 text-ink-soft">{m.informe.observacion}</p>
                    </section>
                    <Listar titulo="Fortalezas observadas" items={m.informe.fortalezas} />
                    <Listar titulo="Aspectos por reforzar" items={m.informe.aspectos_por_reforzar} />
                    <Listar titulo="Recomendaciones" items={m.informe.recomendaciones} />
                    <Listar titulo="Estrategias de clase" items={m.informe.actividades_sugeridas} />
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap break-words text-sm text-ink">{m.texto}</p>
                )}
                <p className="mt-2 text-[11px] text-ink-soft">
                  Apoyo pedagógico generado por IA, no una evaluación clínica ni hechos verificados.
                </p>
              </article>
            ),
          )}
          {isPending && <IndicadorEscribiendo />}
        </div>

        <form onSubmit={enviar} className="flex flex-col gap-3 border-t-2 border-line p-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            Estudiante o grupo
            <select
              value={estudianteId}
              onChange={(e) => setEstudianteId(e.target.value)}
              className="h-11 rounded-lg border border-line bg-paper-raised px-3 text-base sm:text-sm"
            >
              <option value="">Todo mi grupo</option>
              {estudiantes.map((estudiante) => (
                <option key={estudiante.estudiante_id} value={estudiante.estudiante_id}>
                  {estudiante.nombre} · {estudiante.curso ?? "Sin curso"}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="pregunta-educativa" className="sr-only">
            Consulta pedagógica
          </label>
          <textarea
            id="pregunta-educativa"
            value={pregunta}
            onChange={(e) => setPregunta(e.target.value)}
            required
            minLength={PREGUNTA_MIN}
            maxLength={PREGUNTA_MAX}
            rows={3}
            placeholder="¿Qué conceptos convendría repasar con este grupo?"
            className="rounded-xl border-2 border-line bg-paper px-3 py-2 text-base text-ink outline-none focus-visible:border-primary sm:text-sm"
          />
          {error && (
            <p role="alert" className="text-sm text-alert">
              {error}
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-ink-soft">
              {pregunta.length}/{PREGUNTA_MAX}
            </span>
            <Button type="submit" disabled={isPending || pregunta.trim().length < PREGUNTA_MIN}>
              <Send className="h-4 w-4" aria-hidden="true" />
              {isPending ? "Preparando…" : "Consultar"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Listar({ titulo, items }: { titulo: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <h3 className="font-semibold">{titulo}</h3>
      <ul className="mt-0.5 list-disc pl-5 text-ink-soft">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
