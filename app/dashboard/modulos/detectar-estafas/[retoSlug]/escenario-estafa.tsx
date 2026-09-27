"use client";

import { useState, useTransition } from "react";
import { enviarMensajeChat, enviarDecision } from "./actions";
import { puedeEnviarMensaje } from "@/lib/estafas";
import type { MensajeChat } from "@/lib/ai/prompts/estafador";
import type { TutorFeedback } from "@/lib/ai/schemas/tutor";
import { Button } from "@/components/ui/button";
import { FeedbackCard } from "@/components/feedback-card";
import { BurbujaChat, IndicadorEscribiendo } from "@/components/chat-ui";
import { PhoneMessageCard } from "@/components/game/phone-message-card";
import {
  SignalsInvestigation,
  describirSenales,
  type SenalId,
} from "@/components/game/signals-investigation";

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
  const [feedback, setFeedback] = useState<TutorFeedback | null>(
    feedbackPrevio,
  );
  const [mostrarDecision, setMostrarDecision] = useState(!interactivo);
  const [diceEstafa, setDiceEstafa] = useState<"si" | "no" | "">("");
  const [senales, setSenales] = useState<Set<SenalId>>(new Set());
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const mensajesEstudiante = historial.filter(
    (m) => m.autor === "estudiante",
  ).length;
  const ultimo = historial[historial.length - 1];
  const esperandoRespuesta =
    isPending && !mostrarDecision && ultimo?.autor === "estudiante";

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
      const resultado = await enviarMensajeChat(retoSlug, nuevoHistorial);
      if (resultado.success) {
        setHistorial((h) => [
          ...h,
          { autor: "estafador", texto: resultado.mensaje },
        ]);
      } else {
        setError(resultado.error);
      }
    });
  }

  function confirmarDecision() {
    if (!diceEstafa) {
      setError("Primero decide: ¿es estafa o no?");
      return;
    }
    setError(null);

    // Traducimos selección + nota a texto plano — es lo que el backend ya sabe recibir.
    // No cambiamos la firma de enviarDecision ni el schema del tutor.
    const partes: string[] = [describirSenales(senales)];
    if (nota.trim()) partes.push(`Comentario: ${nota.trim()}`);
    const justificacion = partes.join(" ");

    startTransition(async () => {
      const resultado = await enviarDecision(
        retoSlug,
        historial,
        diceEstafa === "si",
        justificacion,
      );
      if (resultado.success && resultado.feedback) {
        setFeedback(resultado.feedback);
      } else {
        setError(resultado.error ?? "Algo salió mal.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Objeto visual: pantalla de teléfono / bandeja de correo */}
      <PhoneMessageCard
        canal={canal}
        remitente={remitente}
        mensaje={mensajeInicial}
      />

      {/* Investigación interactiva (solo escenarios con chat) */}
      {interactivo && (
        <div
          className="flex flex-col gap-2"
          aria-live="polite"
          aria-label="Conversación"
        >
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
                  puedeEnviarMensaje(mensajesEstudiante)
                    ? "Escríbele algo…"
                    : "Ya usaste tus mensajes"
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

      {/* Panel de decisión — SIEMPRE visible cuando corresponde */}
      {mostrarDecision && (
        <div className="flex flex-col gap-5 border-t-2 border-line pt-5">
          {/* Paso 1: señales */}
          <SignalsInvestigation
            seleccionadas={senales}
            onChange={setSenales}
            disabled={isPending}
          />

          {/* Paso 2: veredicto */}
          <div className="flex flex-col gap-2.5">
            <p className="text-sm font-semibold text-ink">Tu veredicto</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={diceEstafa === "si" ? "gold" : "outline"}
                size="md"
                className="press"
                onClick={() => setDiceEstafa("si")}
              >
                Sí, es estafa
              </Button>
              <Button
                type="button"
                variant={diceEstafa === "no" ? "gold" : "outline"}
                size="md"
                className="press"
                onClick={() => setDiceEstafa("no")}
              >
                No, es legítimo
              </Button>
            </div>
          </div>

          {/* Paso 3: nota breve opcional */}
          <div className="flex flex-col gap-2">
            <label htmlFor="nota" className="text-sm font-semibold text-ink">
              ¿Algo más que quieras anotar?{" "}
              <span className="font-normal text-ink-soft">(opcional)</span>
            </label>
            <textarea
              id="nota"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ej: el remitente no es del banco real…"
              rows={2}
              className="rounded-md border border-line bg-paper-raised px-3 py-2 text-sm text-ink outline-none focus-visible:border-gold"
            />
          </div>

          {error && (
            <p className="text-sm text-alert" role="alert">
              {error}
            </p>
          )}

          <Button
            type="button"
            onClick={confirmarDecision}
            disabled={isPending || !diceEstafa}
            className="press self-start"
          >
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
