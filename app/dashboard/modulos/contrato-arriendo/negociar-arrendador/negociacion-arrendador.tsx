"use client";

import { useState, useTransition } from "react";
import { enviarMensajeNegociacion, finalizarNegociacion } from "./actions";
import { puedeEnviarMensaje } from "@/lib/estafas";
import type { MensajeChat } from "@/lib/ai/prompts/arrendador";
import type { TutorFeedback } from "@/lib/ai/schemas/tutor";
import { Button } from "@/components/ui/button";
import { FeedbackCard } from "@/components/feedback-card";
import { BurbujaChat, IndicadorEscribiendo } from "@/components/chat-ui";

const MAX_MENSAJES = 4;

export function NegociacionArrendador({
  mensajeInicial,
  feedbackPrevio,
}: {
  mensajeInicial: string;
  feedbackPrevio: TutorFeedback | null;
}) {
  const [historial, setHistorial] = useState<MensajeChat[]>([]);
  const [mensajeActual, setMensajeActual] = useState("");
  const [feedback, setFeedback] = useState<TutorFeedback | null>(feedbackPrevio);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const mensajesEstudiante = historial.filter((m) => m.autor === "estudiante").length;
  const puedeEscribir = puedeEnviarMensaje(mensajesEstudiante, MAX_MENSAJES);

  // Mientras el arrendador responde un mensaje del estudiante (no mientras se evalúa la negociación).
  const ultimo = historial[historial.length - 1];
  const esperandoRespuesta = isPending && ultimo?.autor === "estudiante";

  if (feedback) {
    // Si es el mismo objeto que llegó por props es historial; si no, lo acaba de dar el tutor.
    return <FeedbackCard feedback={feedback} reciente={feedback !== feedbackPrevio} />;
  }

  function enviarMensaje() {
    const texto = mensajeActual.trim();
    if (!texto) return;
    setError(null);
    const nuevoHistorial: MensajeChat[] = [...historial, { autor: "estudiante", texto }];
    setHistorial(nuevoHistorial);
    setMensajeActual("");

    startTransition(async () => {
      const resultado = await enviarMensajeNegociacion(nuevoHistorial);
      if (resultado.success) {
        setHistorial((h) => [...h, { autor: "arrendador", texto: resultado.mensaje }]);
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
      <div className="flex flex-col gap-2" aria-live="polite" aria-label="Conversación">
        <BurbujaChat propia={false}>{mensajeInicial}</BurbujaChat>
        {historial.map((m, i) => (
          <BurbujaChat key={i} propia={m.autor === "estudiante"}>
            {m.texto}
          </BurbujaChat>
        ))}
        {esperandoRespuesta && <IndicadorEscribiendo />}
      </div>

      <div className="flex gap-2">
        <input
          value={mensajeActual}
          onChange={(e) => setMensajeActual(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && enviarMensaje()}
          disabled={!puedeEscribir || isPending}
          placeholder={puedeEscribir ? "Escríbele al arrendador…" : "Ya usaste tus mensajes"}
          className="h-10 min-w-0 flex-1 rounded-md border border-line bg-paper-raised px-3 text-sm text-ink outline-none focus-visible:border-gold disabled:opacity-50"
        />
        <Button type="button" variant="outline" className="press" onClick={enviarMensaje} disabled={!puedeEscribir || isPending}>
          Enviar
        </Button>
      </div>

      {error && (
        <p className="text-sm text-alert" role="alert">
          {error}
        </p>
      )}

      <Button type="button" onClick={terminar} disabled={isPending || historial.length === 0} className="press self-start">
        {isPending ? "Evaluando…" : "Terminar negociación"}
      </Button>
    </div>
  );
}
