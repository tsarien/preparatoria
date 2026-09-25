"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { hacerAporte } from "./actions";
import {
  calcularMesesParaMeta,
  calcularProgresoPorcentaje,
  metaAlcanzada,
  validarAporte,
} from "@/lib/ahorro";
import type { MetaAhorro } from "@/types/database";
import type { TutorFeedback } from "@/lib/ai/schemas/tutor";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FeedbackCard } from "@/components/feedback-card";
import { consumirFeedbackReciente, lanzarConfeti } from "@/lib/celebrar";

export function MetaTracker({
  metaInicial,
  saldoDisponible,
  feedbackPrevio,
}: {
  metaInicial: MetaAhorro;
  saldoDisponible: number;
  feedbackPrevio: TutorFeedback | null;
}) {
  const [meta, setMeta] = useState(metaInicial);
  const [saldo, setSaldo] = useState(saldoDisponible);
  const [monto, setMonto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const alcanzada = metaAlcanzada(meta.monto_actual, meta.monto_objetivo);
  const meses = calcularMesesParaMeta(meta.monto_objetivo, meta.monto_actual, meta.aporte_mensual_planeado);
  const progreso = calcularProgresoPorcentaje(meta.monto_actual, meta.monto_objetivo);

  // Confeti solo en el momento en que la meta PASA a estar lograda durante esta
  // sesión (un aporte que la completa). Si la página se abre con la meta ya
  // lograda, `alcanzadaAntes` arranca en true y no se dispara nada.
  const alcanzadaAntes = useRef(alcanzada);
  useEffect(() => {
    if (alcanzada && !alcanzadaAntes.current) {
      void lanzarConfeti("grande");
    }
    alcanzadaAntes.current = alcanzada;
  }, [alcanzada]);

  // ¿Estamos viendo el feedback que el tutor acaba de dar (el estudiante venía de
  // crear la meta) o el de una visita anterior? Solo el primero anima y celebra.
  const [feedbackReciente, setFeedbackReciente] = useState(false);
  useEffect(() => {
    if (feedbackPrevio && consumirFeedbackReciente("meta-de-ahorro")) {
      setFeedbackReciente(true);
    }
  }, [feedbackPrevio]);

  function aportar() {
    const valor = Number(monto);
    if (!validarAporte(valor, saldo)) {
      setError(
        valor <= 0
          ? "El aporte debe ser mayor a cero."
          : `No tienes suficiente saldo (tienes $${saldo.toLocaleString("es-CO")}).`
      );
      return;
    }
    setError(null);
    startTransition(async () => {
      const resultado = await hacerAporte(meta.id, valor);
      if (resultado.success) {
        setMeta(resultado.meta);
        setSaldo((s) => s - valor);
        setMonto("");
      } else {
        setError(resultado.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-medium text-ink">{meta.nombre}</h3>
        {alcanzada && (
          <Badge variant="sello" tone="gold" className="animate-stamp">
            Meta<br />lograda
          </Badge>
        )}
      </div>

      <ProgressBar
        value={meta.monto_actual}
        max={meta.monto_objetivo}
        label={`${progreso}% completado`}
        animado
      />

      {alcanzada && (
        <div className="flex items-center gap-3 rounded-2xl border border-gold bg-gold-soft p-3">
          <Image
            src="/mascota/mascota-celebrando.png"
            alt=""
            width={320}
            height={315}
            className="h-14 w-auto shrink-0 animate-pop"
          />
          <p className="text-sm text-ink">
            ¡Meta cumplida! Juntaste{" "}
            <span className="font-mono font-medium">${meta.monto_objetivo.toLocaleString("es-CO")}</span>.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-md border border-line bg-paper-raised p-3">
          <p className="text-xs text-ink-soft">Ahorrado</p>
          <p className="font-mono font-medium text-ink">${meta.monto_actual.toLocaleString("es-CO")}</p>
        </div>
        <div className="rounded-md border border-line bg-paper-raised p-3">
          <p className="text-xs text-ink-soft">Meta</p>
          <p className="font-mono font-medium text-ink">${meta.monto_objetivo.toLocaleString("es-CO")}</p>
        </div>
      </div>

      {!alcanzada && (
        <p className="text-sm text-ink-soft">
          A ${meta.aporte_mensual_planeado.toLocaleString("es-CO")}/mes,{" "}
          {meses === null
            ? "nunca vas a llegar a la meta con un aporte de $0 — ajusta tu plan."
            : `te faltan aproximadamente ${meses} ${meses === 1 ? "mes" : "meses"}.`}
        </p>
      )}

      {!alcanzada && (
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <label htmlFor="aporte" className="text-sm font-medium text-ink">
            Hacer un aporte (tienes ${saldo.toLocaleString("es-CO")} disponibles)
          </label>
          <div className="flex gap-2">
            <input
              id="aporte"
              type="number"
              min="1"
              step="1000"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="100000"
              className="h-10 min-w-0 flex-1 rounded-md border border-line bg-paper-raised px-3 text-sm text-ink outline-none focus-visible:border-gold"
            />
            <Button type="button" onClick={aportar} disabled={isPending} className="press">
              {isPending ? "Aportando…" : "Aportar"}
            </Button>
          </div>
          {error && (
            <p className="text-sm text-alert" role="alert">
              {error}
            </p>
          )}
        </div>
      )}

      {feedbackPrevio && (
        <div className="border-t border-line pt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-soft">
            Cuando creaste esta meta, el tutor dijo:
          </p>
          <FeedbackCard feedback={feedbackPrevio} reciente={feedbackReciente} />
        </div>
      )}
    </div>
  );
}
