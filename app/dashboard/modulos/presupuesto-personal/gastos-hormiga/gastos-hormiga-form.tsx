"use client";

import { useActionState } from "react";
import { enviarGastosHormiga, type GastosHormigaState } from "./actions";
import { Button } from "@/components/ui/button";
import { FeedbackCard } from "@/components/feedback-card";
import type { GastoHormigaItem } from "@/lib/presupuesto";

const ESTADO_INICIAL: GastosHormigaState = {};

export function GastosHormigaForm({ items }: { items: GastoHormigaItem[] }) {
  const enviarConItems = enviarGastosHormiga.bind(null, items);
  const [state, formAction, isPending] = useActionState(enviarConItems, ESTADO_INICIAL);

  if (state.feedback) {
    return <FeedbackCard feedback={state.feedback} reciente />;
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <ul className="flex flex-col divide-y divide-line">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 py-2.5">
            <input
              id={`item_${item.id}`}
              name="seleccionados"
              value={item.id}
              type="checkbox"
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

      <Button type="submit" disabled={isPending} className="press">
        {isPending ? "Revisando…" : "Ver resultado"}
      </Button>
    </form>
  );
}
