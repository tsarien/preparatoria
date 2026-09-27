"use client";

import { useActionState, useMemo, useState } from "react";
import { Check, Wallet } from "lucide-react";
import { enviarDistribucion, type DistribuirSalarioState } from "./actions";
import { Button } from "@/components/ui/button";
import { FeedbackCard } from "@/components/feedback-card";
import { SalaryRewardBanner } from "@/components/game/salary-reward-banner";
import { BudgetCategoryRow } from "@/components/game/budget-category-row";
import { cn } from "@/lib/utils";

const ESTADO_INICIAL: DistribuirSalarioState = {};

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function DistribuirSalarioForm({
  categorias,
  salarioMensual,
}: {
  categorias: string[];
  salarioMensual: number;
}) {
  const enviarConCategorias = enviarDistribucion.bind(null, categorias);
  const [state, formAction, isPending] = useActionState(
    enviarConCategorias,
    ESTADO_INICIAL,
  );
  const [montos, setMontos] = useState<Record<string, number>>(
    Object.fromEntries(categorias.map((c) => [c, 0])),
  );

  const asignado = useMemo(
    () => Object.values(montos).reduce((a, b) => a + b, 0),
    [montos],
  );
  const restante = salarioMensual - asignado;
  const ahorrado = useMemo(
    () =>
      categorias
        .filter((c) => normalizar(c) === "ahorro")
        .reduce((sum, c) => sum + (montos[c] ?? 0), 0),
    [categorias, montos],
  );

  if (state.feedback) {
    return <FeedbackCard feedback={state.feedback} reciente />;
  }

  const cuadra = restante === 0;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {/* Salario como recompensa */}
      <SalaryRewardBanner monto={salarioMensual} />

      {/* Resumen en vivo — Disponible / Asignado / Ahorro */}
      <div className="grid grid-cols-3 gap-2">
        <ResumenCelda
          label="Por asignar"
          value={restante}
          tone={cuadra ? "growth" : restante < 0 ? "alert" : "primary"}
        />
        <ResumenCelda label="Asignado" value={asignado} tone="ink" />
        <ResumenCelda label="Ahorro" value={ahorrado} tone="gold" />
      </div>

      {/* Estado de cuadre — afirmación honesta, no decorativa */}
      <p
        className={cn(
          "flex items-center gap-2 text-sm",
          cuadra ? "text-growth" : "text-ink-soft",
        )}
        aria-live="polite"
      >
        {cuadra ? (
          <>
            <Check className="h-4 w-4" aria-hidden="true" />
            <span className="font-medium">
              Cuadra perfecto — todo el salario está asignado.
            </span>
          </>
        ) : restante < 0 ? (
          <>
            <Wallet className="h-4 w-4 text-alert" aria-hidden="true" />
            <span>
              Te pasaste por{" "}
              <span className="font-mono font-medium text-alert">
                ${Math.abs(restante).toLocaleString("es-CO")}
              </span>
              . Ajusta los montos.
            </span>
          </>
        ) : (
          <>
            <Wallet className="h-4 w-4" aria-hidden="true" />
            <span>
              Aún te quedan{" "}
              <span className="font-mono font-medium text-ink">
                ${restante.toLocaleString("es-CO")}
              </span>{" "}
              sin repartir.
            </span>
          </>
        )}
      </p>

      {/* Categorías */}
      <div className="flex flex-col gap-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
          Reparte tu salario
        </p>
        {categorias.map((categoria) => (
          <BudgetCategoryRow
            key={categoria}
            categoria={categoria}
            valor={montos[categoria] ?? 0}
            salarioTotal={salarioMensual}
            onChange={(v) => setMontos((prev) => ({ ...prev, [categoria]: v }))}
          />
        ))}
      </div>

      {state.error && (
        <p className="text-sm text-alert" role="alert">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        disabled={isPending || !cuadra}
        className="press self-start"
      >
        {isPending ? "Enviando…" : "Confirmar distribución"}
      </Button>
    </form>
  );
}

function ResumenCelda({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "primary" | "growth" | "alert" | "gold" | "ink";
}) {
  const tones = {
    primary: "border-primary/40 bg-primary-soft text-primary",
    growth: "border-growth/40 bg-growth-soft text-growth",
    alert: "border-alert/40 bg-alert-soft text-alert",
    gold: "border-gold bg-gold-soft text-ink",
    ink: "border-line bg-paper-raised text-ink",
  };
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 rounded-xl border-2 px-2.5 py-2",
        tones[tone],
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
        {label}
      </span>
      <span className="break-words font-mono text-sm font-semibold leading-tight">
        ${Math.abs(value).toLocaleString("es-CO")}
      </span>
    </div>
  );
}
