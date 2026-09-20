"use client";

import { useActionState, useMemo, useState } from "react";
import { enviarDistribucion, type DistribuirSalarioState } from "./actions";
import { Button } from "@/components/ui/button";
import { FeedbackCard } from "@/components/feedback-card";

const ESTADO_INICIAL: DistribuirSalarioState = {};

export function DistribuirSalarioForm({
  categorias,
  salarioMensual,
}: {
  categorias: string[];
  salarioMensual: number;
}) {
  const enviarConCategorias = enviarDistribucion.bind(null, categorias);
  const [state, formAction, isPending] = useActionState(enviarConCategorias, ESTADO_INICIAL);
  const [montos, setMontos] = useState<Record<string, number>>(
    Object.fromEntries(categorias.map((c) => [c, 0]))
  );

  const asignado = useMemo(() => Object.values(montos).reduce((a, b) => a + b, 0), [montos]);
  const restante = salarioMensual - asignado;

  if (state.feedback) {
    return <FeedbackCard feedback={state.feedback} />;
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="rounded-md border border-line bg-paper-raised p-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-ink-soft">Por asignar</span>
          <span
            className={`font-mono text-lg font-medium ${restante === 0 ? "text-growth" : "text-ink"}`}
          >
            ${restante.toLocaleString("es-CO")}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {categorias.map((categoria) => (
          <div key={categoria} className="flex flex-col gap-1.5">
            <label htmlFor={`monto_${categoria}`} className="text-sm font-medium text-ink">
              {categoria}
            </label>
            <input
              id={`monto_${categoria}`}
              name={`monto_${categoria}`}
              type="number"
              min="0"
              step="1000"
              value={montos[categoria]}
              onChange={(e) =>
                setMontos((prev) => ({ ...prev, [categoria]: Number(e.target.value) || 0 }))
              }
              className="h-10 rounded-md border border-line bg-paper-raised px-3 text-sm text-ink outline-none focus-visible:border-gold"
            />
          </div>
        ))}
      </div>

      {state.error && (
        <p className="text-sm text-alert" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={isPending || restante !== 0}>
        {isPending ? "Enviando…" : "Confirmar distribución"}
      </Button>
    </form>
  );
}
