"use client";

import { useActionState, useMemo, useState } from "react";
import { enviarPriorizacion, type PriorizarGastosState } from "./actions";
import { Button } from "@/components/ui/button";
import { FeedbackCard } from "@/components/feedback-card";
import type { PriorizarGastosItem } from "@/lib/presupuesto";

const ESTADO_INICIAL: PriorizarGastosState = {};

export function PriorizarGastosForm({
  items,
  presupuesto,
}: {
  items: PriorizarGastosItem[];
  presupuesto: number;
}) {
  const enviarConDatos = enviarPriorizacion.bind(null, items, presupuesto);
  const [state, formAction, isPending] = useActionState(enviarConDatos, ESTADO_INICIAL);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());

  const total = useMemo(
    () => items.filter((i) => seleccionados.has(i.id)).reduce((sum, i) => sum + i.monto, 0),
    [items, seleccionados]
  );
  const restante = presupuesto - total;

  if (state.feedback) {
    return <FeedbackCard feedback={state.feedback} reciente />;
  }

  function toggle(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="rounded-md border border-line bg-paper-raised p-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-ink-soft">Presupuesto disponible</span>
          <span
            className={`font-mono text-lg font-medium ${restante < 0 ? "text-alert" : "text-ink"}`}
          >
            ${restante.toLocaleString("es-CO")}
          </span>
        </div>
      </div>

      <ul className="flex flex-col divide-y divide-line">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 py-2.5">
            <input
              id={`item_${item.id}`}
              name="seleccionados"
              value={item.id}
              type="checkbox"
              checked={seleccionados.has(item.id)}
              onChange={() => toggle(item.id)}
              className="h-4 w-4 accent-[var(--color-gold)]"
            />
            <label htmlFor={`item_${item.id}`} className="flex-1 text-sm text-ink">
              {item.nombre}
            </label>
            <span className="font-mono text-sm text-ink-soft">${item.monto.toLocaleString("es-CO")}</span>
          </li>
        ))}
      </ul>

      {state.error && (
        <p className="text-sm text-alert" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={isPending || restante < 0} className="press">
        {isPending ? "Enviando…" : "Confirmar elección"}
      </Button>
    </form>
  );
}
