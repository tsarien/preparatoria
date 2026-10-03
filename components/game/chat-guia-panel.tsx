"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { History, MessageCircle, Plus, Send, Trash2, X } from "lucide-react";
import {
  abrirConversacionGuia,
  borrarConversacion,
  cargarEstadoGuia,
  enviarMensajeGuia,
} from "@/app/dashboard/guia/actions";
import {
  MAX_CARACTERES_MENSAJE,
  type ConversacionResumen,
  type EstadoGuia,
} from "@/app/dashboard/guia/types";
import type { MensajeGuia } from "@/lib/ai/prompts/guia";
import { CharacterBubble } from "@/components/game/character-bubble";
import { IndicadorEscribiendo } from "@/components/chat-ui";
import { GuiaSuggestionCard } from "@/components/game/guia-suggestion-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SUGERENCIAS = [
  {
    icono: "/iconos/icono-presupuesto.png",
    titulo: "Presupuesto",
    prompt: "Explícame cómo repartir bien mi salario entre categorías.",
  },
  {
    icono: "/iconos/icono-seguridad.png",
    titulo: "Estafas",
    prompt: "¿Cómo reconozco si un mensaje es una estafa?",
  },
  {
    icono: "/iconos/icono-contrato.png",
    titulo: "Arriendo",
    prompt: "¿Qué debo revisar en un contrato de arriendo antes de firmarlo?",
  },
  {
    icono: "/iconos/icono-ahorro.png",
    titulo: "Ahorro",
    prompt: "¿Cómo hago para ahorrar todos los meses sin quedarme sin plata?",
  },
];

interface Props {
  /**
   * "pagina": incrustado en /dashboard/guia (estado inicial renderizado en el servidor).
   * "flotante": dentro del cajón global; carga el estado al abrirse por primera vez.
   */
  variante: "pagina" | "flotante";
  /** Solo flotante: se carga el estado la primera vez que está abierto. */
  abierto?: boolean;
  estadoInicial?: EstadoGuia;
  mensajesHoy?: number;
  onCerrar?: () => void;
  /** Para devolver el foco al campo de texto al abrir. */
  autoFoco?: boolean;
}

function formatearFecha(iso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Bogota",
  }).format(new Date(iso));
}

/**
 * Chat de la IA Guía. ÚNICA interfaz: la usan la página /dashboard/guia y el cajón flotante
 * global (floating-ai-guide.tsx). La lógica de IA y la persistencia viven en las acciones de
 * app/dashboard/guia/actions.ts (tabla mensajes_ia_guia + conversaciones_ia en Supabase).
 */
export function ChatGuiaPanel({
  variante,
  abierto = true,
  estadoInicial,
  mensajesHoy,
  onCerrar,
  autoFoco = false,
}: Props) {
  const [conversacionId, setConversacionId] = useState<string | null>(
    estadoInicial?.conversacionId ?? null,
  );
  const [historial, setHistorial] = useState<MensajeGuia[]>(
    estadoInicial?.mensajes ?? [],
  );
  const [conversaciones, setConversaciones] = useState<ConversacionResumen[]>(
    estadoInicial?.conversaciones ?? [],
  );
  const [cargando, setCargando] = useState(variante === "flotante");
  const [cargado, setCargado] = useState(Boolean(estadoInicial));
  const [vista, setVista] = useState<"chat" | "historial">("chat");
  const [mensajeActual, setMensajeActual] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviadosHoy, setEnviadosHoy] = useState(mensajesHoy);
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const campoRef = useRef<HTMLInputElement>(null);

  // Cajón flotante: el historial se trae del servidor la primera vez que se abre.
  useEffect(() => {
    if (variante !== "flotante" || !abierto || cargado) return;
    let vigente = true;
    cargarEstadoGuia()
      .then((estado) => {
        if (!vigente) return;
        setConversacionId(estado.conversacionId);
        setHistorial(estado.mensajes);
        setConversaciones(estado.conversaciones);
        setCargado(true);
      })
      .catch(() => {
        if (vigente) setError("No se pudo cargar tu historial. Intenta de nuevo.");
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [variante, abierto, cargado]);

  useEffect(() => {
    if (abierto && autoFoco && vista === "chat" && !cargando)
      campoRef.current?.focus();
  }, [abierto, autoFoco, vista, cargando]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [historial.length, isPending, vista, abierto]);

  const registrarConversacion = useCallback(
    (id: string, titulo: string | undefined) => {
      setConversaciones((previas) => {
        const resto = previas.filter((c) => c.id !== id);
        return [
          {
            id,
            titulo: titulo ?? previas.find((c) => c.id === id)?.titulo ?? "Conversación",
            actualizado_en: new Date().toISOString(),
          },
          ...resto,
        ];
      });
    },
    [],
  );

  function enviar(textoOverride?: string) {
    const texto = (textoOverride ?? mensajeActual).trim();
    if (!texto || isPending) return;
    setError(null);
    setMensajeActual("");

    // Optimista: muestra ya el mensaje del usuario.
    const anterior = historial;
    setHistorial([...anterior, { autor: "estudiante", texto }]);

    startTransition(async () => {
      const resultado = await enviarMensajeGuia(texto, conversacionId);
      if (resultado.conversacionId) {
        setConversacionId(resultado.conversacionId);
        registrarConversacion(resultado.conversacionId, resultado.titulo);
      }
      if (resultado.success && resultado.respuesta) {
        setHistorial((h) => [
          ...h,
          { autor: "guia", texto: resultado.respuesta! },
        ]);
        setEnviadosHoy((n) => (n === undefined ? n : n + 1));
      } else {
        setError(resultado.error ?? "Algo salió mal.");
        setHistorial(anterior); // si falló, quitamos el optimista
      }
    });
  }

  function nuevaConversacion() {
    setConversacionId(null);
    setHistorial([]);
    setError(null);
    setVista("chat");
  }

  function abrirConversacion(id: string) {
    setError(null);
    startTransition(async () => {
      const r = await abrirConversacionGuia(id);
      if (r) {
        setConversacionId(r.conversacionId);
        setHistorial(r.mensajes);
        setVista("chat");
      } else {
        setError("No se pudo abrir esa conversación.");
      }
    });
  }

  function eliminarConversacion(id: string) {
    if (
      !window.confirm(
        "¿Borrar esta conversación? Esta acción no se puede deshacer.",
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      const r = await borrarConversacion(id);
      if (!r.success) {
        setError("No se pudo borrar la conversación. Intenta de nuevo.");
        return;
      }
      setConversaciones((previas) => previas.filter((c) => c.id !== id));
      if (id === conversacionId) {
        setConversacionId(null);
        setHistorial([]);
      }
    });
  }

  const vacio = historial.length === 0;
  const flotante = variante === "flotante";

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden bg-paper-raised",
        flotante ? "h-full" : "game-card rounded-3xl",
      )}
    >
      {/* Cabecera */}
      <div className="flex items-center gap-2 border-b-2 border-line bg-gradient-to-r from-primary-soft via-paper-raised to-gold-soft px-3 py-2.5">
        {flotante && (
          <Image
            src="/mascota/mascota-neutral.png"
            alt=""
            width={320}
            height={315}
            className="h-9 w-auto shrink-0"
          />
        )}
        <div className="min-w-0 flex-1 leading-tight">
          {flotante && (
            <p className="font-display text-base font-semibold text-ink">IA Guía</p>
          )}
          <p className="flex items-center gap-1.5 truncate text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            <MessageCircle className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            {vista === "historial"
              ? "Conversaciones anteriores"
              : enviadosHoy === undefined
                ? "Tu compañero de aprendizaje"
                : enviadosHoy === 0
                  ? "Empieza la conversación"
                  : `${enviadosHoy} ${enviadosHoy === 1 ? "mensaje" : "mensajes"} hoy`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setVista((v) => (v === "chat" ? "historial" : "chat"))}
          aria-pressed={vista === "historial"}
          aria-label="Ver conversaciones anteriores"
          title="Conversaciones anteriores"
          className={cn(
            "press grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line text-ink-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            vista === "historial" && "border-primary bg-primary-soft text-primary",
          )}
        >
          <History className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={nuevaConversacion}
          disabled={isPending}
          aria-label="Empezar una conversación nueva"
          title="Nueva conversación"
          className="press grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line text-ink-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
        {onCerrar && (
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar chat"
            title="Cerrar"
            className="press grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line text-ink-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {vista === "historial" ? (
        <div className="flex min-h-[14rem] flex-1 flex-col gap-2 overflow-y-auto p-3">
          {conversaciones.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-soft">
              Todavía no tienes conversaciones guardadas.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {conversaciones.map((c) => (
                <li
                  key={c.id}
                  className={cn(
                    "flex items-stretch gap-1 rounded-xl border-2",
                    c.id === conversacionId
                      ? "border-primary bg-primary-soft"
                      : "border-line bg-paper",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => abrirConversacion(c.id)}
                    disabled={isPending}
                    className="min-w-0 flex-1 rounded-l-xl px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary disabled:opacity-60"
                  >
                    <span className="block truncate text-sm font-semibold text-ink">
                      {c.titulo}
                    </span>
                    <span className="block text-[11px] text-ink-soft">
                      {formatearFecha(c.actualizado_en)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminarConversacion(c.id)}
                    disabled={isPending}
                    aria-label={`Borrar conversación: ${c.titulo}`}
                    className="grid w-10 shrink-0 place-items-center rounded-r-xl text-ink-soft hover:bg-alert-soft hover:text-alert focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-alert disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <>
          <div
            ref={scrollRef}
            className={cn(
              "flex flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-4",
              flotante ? "min-h-0" : "max-h-[55vh] min-h-[18rem]",
            )}
            aria-live="polite"
            aria-label="Conversación con la IA Guía"
          >
            {cargando ? (
              <p className="py-8 text-center text-sm text-ink-soft">
                Cargando tu conversación…
              </p>
            ) : vacio ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <Image
                  src="/mascota/mascota-neutral.png"
                  alt=""
                  width={320}
                  height={315}
                  className="h-20 w-auto animate-pop"
                />
                <p className="max-w-sm text-sm text-ink-soft">
                  Hola. Soy tu Guía. Pregúntame lo que quieras sobre plata,
                  contratos, estafas o ahorro — o empieza por una de estas:
                </p>
              </div>
            ) : (
              historial.map((m, i) => (
                <CharacterBubble
                  key={i}
                  nombre={m.autor === "guia" ? "IA Guía" : "Tú"}
                  inicial={m.autor === "estudiante" ? "T" : undefined}
                  tono={m.autor === "estudiante" ? "yo" : "guia"}
                  avatarSrc={
                    m.autor === "guia" ? "/mascota/mascota-neutral.png" : undefined
                  }
                >
                  {m.texto}
                </CharacterBubble>
              ))
            )}
            {isPending && <IndicadorEscribiendo />}
          </div>

          {vacio && !cargando && (
            <div className="grid grid-cols-2 gap-2 border-t-2 border-line p-3 sm:grid-cols-4 lg:max-xl:grid-cols-2">
              {SUGERENCIAS.map((s) => (
                <GuiaSuggestionCard
                  key={s.titulo}
                  icono={s.icono}
                  titulo={s.titulo}
                  prompt={s.prompt}
                  onClick={enviar}
                  disabled={isPending}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Composer */}
      {vista === "chat" && (
        <div className="flex flex-col gap-2 border-t-2 border-line p-3">
          {error && (
            <p className="text-sm text-alert" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <input
              ref={campoRef}
              value={mensajeActual}
              onChange={(e) => setMensajeActual(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && enviar()}
              disabled={isPending || cargando}
              maxLength={MAX_CARACTERES_MENSAJE}
              aria-label="Mensaje para la IA Guía"
              placeholder="Escríbele a tu Guía…"
              className="h-11 min-w-0 flex-1 rounded-xl border-2 border-line bg-paper px-3 text-base text-ink outline-none focus-visible:border-gold disabled:opacity-50 sm:text-sm"
            />
            <Button
              type="button"
              onClick={() => enviar()}
              disabled={isPending || cargando || !mensajeActual.trim()}
              className="press"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Enviar</span>
            </Button>
          </div>
        </div>
      )}
      {vista === "historial" && error && (
        <p className="border-t-2 border-line p-3 text-sm text-alert" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
