"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { Send, Trash2, MessageCircle } from "lucide-react";
import { enviarMensajeGuia, borrarHistorial } from "./actions";
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

interface ChatGuiaProps {
  historialInicial: MensajeGuia[];
  mensajesHoy: number;
}

export function ChatGuia({ historialInicial, mensajesHoy }: ChatGuiaProps) {
  const [historial, setHistorial] = useState<MensajeGuia[]>(historialInicial);
  const [mensajeActual, setMensajeActual] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviadosHoy, setEnviadosHoy] = useState(mensajesHoy);
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al último mensaje cuando llega uno nuevo (o mientras escribe).
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [historial.length, isPending]);

  function enviar(textoOverride?: string) {
    const texto = (textoOverride ?? mensajeActual).trim();
    if (!texto) return;
    setError(null);
    setMensajeActual("");

    // Optimista: muestra ya el mensaje del estudiante.
    const anterior = historial;
    setHistorial([...anterior, { autor: "estudiante", texto }]);

    startTransition(async () => {
      const resultado = await enviarMensajeGuia(texto);
      if (resultado.success && resultado.respuesta) {
        setHistorial((h) => [
          ...h,
          { autor: "guia", texto: resultado.respuesta! },
        ]);
        setEnviadosHoy((n) => n + 1);
      } else {
        setError(resultado.error ?? "Algo salió mal.");
        setHistorial(anterior); // si falló, quitamos el optimista
      }
    });
  }

  function empezarDeNuevo() {
    if (
      !window.confirm(
        "¿Borrar toda la conversación? Esta acción no se puede deshacer.",
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      const r = await borrarHistorial();
      if (r.success) {
        setHistorial([]);
        setEnviadosHoy(0);
      } else {
        setError("No se pudo borrar el historial. Intenta de nuevo.");
      }
    });
  }

  const vacio = historial.length === 0;

  return (
    <div className="game-card flex flex-col overflow-hidden rounded-3xl bg-paper-raised">
      {/* Barra superior: contador informativo + borrar */}
      <div className="flex items-center justify-between gap-3 border-b-2 border-line bg-gradient-to-r from-primary-soft via-paper-raised to-gold-soft px-4 py-2.5">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
          <MessageCircle
            className="h-3.5 w-3.5 text-primary"
            aria-hidden="true"
          />
          {enviadosHoy === 0
            ? "Empieza la conversación"
            : `${enviadosHoy} ${enviadosHoy === 1 ? "mensaje" : "mensajes"} hoy`}
        </span>
        {!vacio && (
          <button
            type="button"
            onClick={empezarDeNuevo}
            disabled={isPending}
            aria-label="Borrar conversación"
            className="press inline-flex items-center gap-1 rounded-full border border-line bg-paper-raised px-2.5 py-0.5 text-[11px] text-ink-soft hover:text-ink disabled:opacity-50"
          >
            <Trash2 className="h-3 w-3" aria-hidden="true" />
            Empezar de nuevo
          </button>
        )}
      </div>

      {/* Conversación */}
      <div
        ref={scrollRef}
        className="flex max-h-[55vh] min-h-[18rem] flex-col gap-3 overflow-y-auto p-4"
        aria-live="polite"
        aria-label="Conversación con la IA Guía"
      >
        {vacio ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Image
              src="/mascota/mascota-neutral.png"
              alt=""
              width={320}
              height={315}
              className="h-24 w-auto animate-pop"
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

      {/* Sugerencias — solo con el chat vacío */}
      {vacio && (
        <div className="grid grid-cols-2 gap-2 border-t-2 border-line p-3 sm:grid-cols-4">
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

      {/* Composer */}
      <div className="flex flex-col gap-2 border-t-2 border-line p-3">
        {error && (
          <p className="text-sm text-alert" role="alert">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <input
            value={mensajeActual}
            onChange={(e) => setMensajeActual(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && enviar()}
            disabled={isPending}
            placeholder="Escríbele a tu Guía…"
            className={cn(
              "h-11 min-w-0 flex-1 rounded-xl border-2 border-line bg-paper px-3 text-sm text-ink outline-none focus-visible:border-gold disabled:opacity-50",
            )}
          />
          <Button
            type="button"
            onClick={() => enviar()}
            disabled={isPending || !mensajeActual.trim()}
            className="press"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Enviar</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
