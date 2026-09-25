"use client";

import { useState, useTransition } from "react";
import { enviarMensajeChat, enviarDecision } from "./actions";
import { puedeEnviarMensaje } from "@/lib/estafas";
import type { MensajeChat } from "@/lib/ai/prompts/estafador";
import type { TutorFeedback } from "@/lib/ai/schemas/tutor";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FeedbackCard } from "@/components/feedback-card";
import { BurbujaChat, IndicadorEscribiendo } from "@/components/chat-ui";

interface Props {
  retoSlug: string;
  canal: string;
  remitente: string;
  mensajeInicial: string;
  interactivo: boolean;
  feedbackPrevio: TutorFeedback | null;
}

export function EscenarioEstafa({
  retoSlug,
  canal,
  remitente,
  mensajeInicial,
  interactivo,
  feedbackPrevio,
}: Props) {
  const [historial, setHistorial] = useState<MensajeChat[]>([]);
  const [mensajeActual, setMensajeActual] = useState("");
  const [feedback, setFeedback] = useState<TutorFeedback | null>(feedbackPrevio);
  const [mostrarDecision, setMostrarDecision] = useState(!interactivo);
  const [diceEstafa, setDiceEstafa] = useState<"si" | "no" | "">("");
  const [justificacion, setJustificacion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const mensajesEstudiante = historial.filter((m) => m.autor === "estudiante").length;

  // Mientras la IA responde un mensaje del estudiante (no mientras evalúa la decisión final).
  const ultimo = historial[historial.length - 1];
  const esperandoRespuesta = isPending && !mostrarDecision && ultimo?.autor === "estudiante";

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
      const resultado = await enviarMensajeChat(retoSlug, nuevoHistorial);
      if (resultado.success) {
        setHistorial((h) => [...h, { autor: "estafador", texto: resultado.mensaje }]);
      } else {
        setError(resultado.error);
      }
    });
  }

  function confirmarDecision() {
    if (!diceEstafa || !justificacion.trim()) {
      setError("Responde si es estafa y explica por qué, así sea en una frase.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const resultado = await enviarDecision(retoSlug, historial, diceEstafa === "si", justificacion);
      if (resultado.success && resultado.feedback) {
        setFeedback(resultado.feedback);
      } else {
        setError(resultado.error ?? "Algo salió mal.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-line bg-paper-raised p-3.5">
        <div className="mb-2 flex items-center justify-between">
          <Badge tone="ink">{canal}</Badge>
          <span className="text-xs text-ink-soft">{remitente}</span>
        </div>
        <p className="text-sm text-ink">{mensajeInicial}</p>
      </div>

      {interactivo && (
        <div className="flex flex-col gap-2" aria-live="polite" aria-label="Conversación">
          {historial.map((m, i) => (
            <BurbujaChat key={i} propia={m.autor === "estudiante"}>
              {m.texto}
            </BurbujaChat>
          ))}
          {esperandoRespuesta && <IndicadorEscribiendo />}

          {!mostrarDecision && (
            <div className="mt-2 flex gap-2">
              <input
                value={mensajeActual}
                onChange={(e) => setMensajeActual(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && enviarMensaje()}
                disabled={!puedeEnviarMensaje(mensajesEstudiante) || isPending}
                placeholder={
                  puedeEnviarMensaje(mensajesEstudiante) ? "Escríbele algo…" : "Ya usaste tus mensajes"
                }
                className="h-10 min-w-0 flex-1 rounded-md border border-line bg-paper-raised px-3 text-sm text-ink outline-none focus-visible:border-gold disabled:opacity-50"
              />
              <Button
                type="button"
                variant="outline"
                className="press"
                onClick={enviarMensaje}
                disabled={!puedeEnviarMensaje(mensajesEstudiante) || isPending}
              >
                Enviar
              </Button>
            </div>
          )}

          {!mostrarDecision && (
            <button
              type="button"
              onClick={() => setMostrarDecision(true)}
              className="self-start text-sm text-ink-soft underline underline-offset-2"
            >
              Ya sé qué es esto →
            </button>
          )}
        </div>
      )}

      {mostrarDecision && (
        <div className="flex flex-col gap-3 border-t border-line pt-4">
          <p className="text-sm font-medium text-ink">¿Esto es una estafa?</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={diceEstafa === "si" ? "gold" : "outline"}
              size="sm"
              className="press"
              onClick={() => setDiceEstafa("si")}
            >
              Sí, es estafa
            </Button>
            <Button
              type="button"
              variant={diceEstafa === "no" ? "gold" : "outline"}
              size="sm"
              className="press"
              onClick={() => setDiceEstafa("no")}
            >
              No, es legítimo
            </Button>
          </div>
          <textarea
            value={justificacion}
            onChange={(e) => setJustificacion(e.target.value)}
            placeholder="¿Por qué? Menciona qué te hizo sospechar (o confiar)."
            rows={3}
            className="rounded-md border border-line bg-paper-raised px-3 py-2 text-sm text-ink outline-none focus-visible:border-gold"
          />

          {error && (
            <p className="text-sm text-alert" role="alert">
              {error}
            </p>
          )}

          <Button type="button" onClick={confirmarDecision} disabled={isPending} className="press self-start">
            {isPending ? "Enviando…" : "Confirmar mi decisión"}
          </Button>
        </div>
      )}

      {!mostrarDecision && error && (
        <p className="text-sm text-alert" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
