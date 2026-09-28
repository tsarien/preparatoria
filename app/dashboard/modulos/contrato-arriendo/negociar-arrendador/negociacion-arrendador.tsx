"use client";

import { useState, useTransition } from "react";
import { Building2 } from "lucide-react";
import { enviarMensajeNegociacion, finalizarNegociacion } from "./actions";
import { puedeEnviarMensaje } from "@/lib/estafas";
import type { MensajeChat } from "@/lib/ai/prompts/arrendador";
import type { TutorFeedback } from "@/lib/ai/schemas/tutor";
import { Button } from "@/components/ui/button";
import { FeedbackCard } from "@/components/feedback-card";
import { CharacterBubble } from "@/components/game/character-bubble";
import { IndicadorEscribiendo } from "@/components/chat-ui";

const MAX_MENSAJES = 4;
const NOMBRE_ARRENDADOR = "Andrés Beltrán";

export function NegociacionArrendador({
  mensajeInicial,
  feedbackPrevio,
}: {
  mensajeInicial: string;
  feedbackPrevio: TutorFeedback | null;
}) {
  const [historial, setHistorial] = useState<MensajeChat[]>([]);
  const [mensajeActual, setMensajeActual] = useState("");
  const [feedback, setFeedback] = useState<TutorFeedback | null>(
    feedbackPrevio,
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const mensajesEstudiante = historial.filter(
    (m) => m.autor === "estudiante",
  ).length;
  const puedeEscribir = puedeEnviarMensaje(mensajesEstudiante, MAX_MENSAJES);

  const ultimo = historial[historial.length - 1];
  const esperandoRespuesta = isPending && ultimo?.autor === "estudiante";

  if (feedback) {
    return (
      <FeedbackCard
        feedback={feedback}
        reciente={feedback !== feedbackPrevio}
      />
    );
  }

  function enviarMensaje() {
    const texto = mensajeActual.trim();
    if (!texto) return;
    setError(null);
    const nuevoHistorial: MensajeChat[] = [
      ...historial,
      { autor: "estudiante", texto },
    ];
    setHistorial(nuevoHistorial);
    setMensajeActual("");

    startTransition(async () => {
      const resultado = await enviarMensajeNegociacion(nuevoHistorial);
      if (resultado.success) {
        setHistorial((h) => [
          ...h,
          { autor: "arrendador", texto: resultado.mensaje },
        ]);
      } else {
        setError(resultado.error);
      }
    });
  }

  function terminar() {
    setError(null);
    startTransition(async () => {
      const resultado = await finalizarNegociacion(historial);
      if (resultado.success && resultado.feedback) {
        setFeedback(resultado.feedback);
      } else {
        setError(resultado.error ?? "Algo salió mal.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Presencia del personaje */}
      <div className="flex items-center gap-3 rounded-2xl border-2 border-primary/30 bg-primary-soft px-3.5 py-2.5">
        <span
          aria-hidden="true"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-primary/50 bg-primary text-white"
        >
          <Building2 className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
            En conversación con
          </p>
          <p className="wrap-break-word text-sm font-medium text-ink">
            {NOMBRE_ARRENDADOR}
          </p>
        </div>
        <span className="shrink-0 font-mono text-[11px] text-ink-soft">
          {mensajesEstudiante} / {MAX_MENSAJES}
        </span>
      </div>

      {/* Historial */}
      <div
        className="flex flex-col gap-3"
        aria-live="polite"
        aria-label="Conversación"
      >
        <CharacterBubble nombre={NOMBRE_ARRENDADOR} tono="arrendador">
          {mensajeInicial}
        </CharacterBubble>
        {historial.map((m, i) => (
          <CharacterBubble
            key={i}
            nombre={m.autor === "estudiante" ? "Tú" : NOMBRE_ARRENDADOR}
            inicial={m.autor === "estudiante" ? "T" : undefined}
            tono={m.autor === "estudiante" ? "yo" : "arrendador"}
          >
            {m.texto}
          </CharacterBubble>
        ))}
        {esperandoRespuesta && <IndicadorEscribiendo />}
      </div>

      {/* Composer */}
      <div className="flex gap-2">
        <input
          value={mensajeActual}
          onChange={(e) => setMensajeActual(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && enviarMensaje()}
          disabled={!puedeEscribir || isPending}
          placeholder={
            puedeEscribir
              ? "Escríbele al arrendador…"
              : "Ya usaste tus mensajes"
          }
          className="h-11 min-w-0 flex-1 rounded-xl border-2 border-line bg-paper-raised px-3 text-sm text-ink outline-none focus-visible:border-gold disabled:opacity-50"
        />
        <Button
          type="button"
          variant="outline"
          className="press"
          onClick={enviarMensaje}
          disabled={!puedeEscribir || isPending}
        >
          Enviar
        </Button>
      </div>

      {error && (
        <p className="text-sm text-alert" role="alert">
          {error}
        </p>
      )}

      <Button
        type="button"
        onClick={terminar}
        disabled={isPending || historial.length === 0}
        className="press self-start"
      >
        {isPending ? "Evaluando…" : "Terminar negociación"}
      </Button>
    </div>
  );
}
