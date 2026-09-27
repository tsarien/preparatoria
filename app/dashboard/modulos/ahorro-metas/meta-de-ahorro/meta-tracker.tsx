"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { hacerAporte } from "./actions";
import {
  calcularMesesParaMeta,
  metaAlcanzada,
  validarAporte,
} from "@/lib/ahorro";
import type { MetaAhorro } from "@/types/database";
import type { TutorFeedback } from "@/lib/ai/schemas/tutor";
import { Button } from "@/components/ui/button";
import { FeedbackCard } from "@/components/feedback-card";
import { SavingsGoalCard } from "@/components/game/savings-goal-card";
import { GameRewardBanner } from "@/components/game/game-reward-banner";
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
  const [ultimoAporte, setUltimoAporte] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const alcanzada = metaAlcanzada(meta.monto_actual, meta.monto_objetivo);
  const meses = calcularMesesParaMeta(
    meta.monto_objetivo,
    meta.monto_actual,
    meta.aporte_mensual_planeado,
  );

  // Confeti solo cuando la meta PASA a estar lograda durante esta sesión.
  const alcanzadaAntes = useRef(alcanzada);
  useEffect(() => {
    if (alcanzada && !alcanzadaAntes.current) {
      void lanzarConfeti("grande");
    }
    alcanzadaAntes.current = alcanzada;
  }, [alcanzada]);

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
          : `No tienes suficiente saldo (tienes $${saldo.toLocaleString("es-CO")}).`,
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
        setUltimoAporte(valor);
      } else {
        setError(resultado.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <SavingsGoalCard
        nombre={meta.nombre}
        montoObjetivo={meta.monto_objetivo}
        montoActual={meta.monto_actual}
        aporteMensualPlaneado={meta.aporte_mensual_planeado}
        mesesFaltantes={meses}
      />

      {/* Confirmación visual tras un aporte */}
      {ultimoAporte !== null && (
        <GameRewardBanner
          dinero={ultimoAporte}
          mensaje="Aporte registrado — tu meta avanzó"
        />
      )}

      {/* Formulario de aporte */}
      {!alcanzada && (
        <div className="game-card flex flex-col gap-3 rounded-2xl bg-paper-raised p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            Hacer un aporte
          </p>
          <label htmlFor="aporte" className="text-sm text-ink">
            Tienes{" "}
            <span className="font-mono font-medium">
              ${saldo.toLocaleString("es-CO")}
            </span>{" "}
            disponibles
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
              className="h-11 min-w-0 flex-1 rounded-xl border-2 border-line bg-paper px-3 font-mono text-sm text-ink outline-none focus-visible:border-gold"
            />
            <Button
              type="button"
              onClick={aportar}
              disabled={isPending}
              className="press"
            >
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

      {/* Celebración de meta cumplida */}
      {alcanzada && (
        <div className="game-card flex items-center gap-4 rounded-2xl border-2 border-gold bg-gold-soft p-4">
          <Image
            src="/mascota/mascota-celebrando.png"
            alt=""
            width={320}
            height={315}
            className="h-16 w-auto shrink-0 animate-pop"
          />
          <div className="min-w-0 flex-1">
            <p className="font-display text-base font-semibold text-ink">
              ¡Meta lograda!
            </p>
            <p className="text-sm text-ink-soft">
              Juntaste{" "}
              <span className="font-mono font-medium text-ink">
                ${meta.monto_objetivo.toLocaleString("es-CO")}
              </span>
              . Tu yo del futuro te lo agradece.
            </p>
          </div>
        </div>
      )}

      {/* Feedback previo del tutor */}
      {feedbackPrevio && (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            Cuando creaste esta meta, tu tutor dijo:
          </p>
          <FeedbackCard feedback={feedbackPrevio} reciente={feedbackReciente} />
        </div>
      )}
    </div>
  );
}
