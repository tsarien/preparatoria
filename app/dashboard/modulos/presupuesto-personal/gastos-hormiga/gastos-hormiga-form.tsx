"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { enviarGastosHormiga, type GastosHormigaState } from "./actions";
import { Button } from "@/components/ui/button";
import { FeedbackCard } from "@/components/feedback-card";
import { cn } from "@/lib/utils";
import type { GastoHormigaItem } from "@/lib/presupuesto";

const ESTADO_INICIAL: GastosHormigaState = {};

export function GastosHormigaForm({ items }: { items: GastoHormigaItem[] }) {
  const enviarConItems = enviarGastosHormiga.bind(null, items);
  const [state, formAction, isPending] = useActionState(
    enviarConItems,
    ESTADO_INICIAL,
  );
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());

  const totalMarcados = items
    .filter((i) => seleccionados.has(i.id))
    .reduce((sum, i) => sum + i.monto, 0);

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
      {/* Contador flotante de marcados — refuerza el "detective" */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-primary/30 bg-primary-soft px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          Marcados
        </span>
        <span className="font-mono text-sm font-semibold text-ink">
          {seleccionados.size} / {items.length}
        </span>
        {seleccionados.size > 0 && (
          <span className="text-xs text-ink-soft">
            · ${totalMarcados.toLocaleString("es-CO")} en sospechosos
          </span>
        )}
      </div>

      <ul className="flex flex-col gap-2">
        {items.map((item, i) => {
          const activo = seleccionados.has(item.id);
          return (
            <li
              key={item.id}
              className="animate-fade-up"
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            >
              <label
                className={cn(
                  "press flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-colors duration-150",
                  activo
                    ? "border-gold bg-gold-soft"
                    : "border-line bg-paper-raised hover:border-primary/40",
                )}
              >
                <input
                  id={`item_${item.id}`}
                  name="seleccionados"
                  value={item.id}
                  type="checkbox"
                  checked={activo}
                  onChange={() => toggle(item.id)}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2",
                    activo
                      ? "border-gold bg-gold text-[#1f2430]"
                      : "border-line bg-paper",
                  )}
                >
                  {activo && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1 break-words text-sm text-ink">
                  {item.nombre}
                </span>
                <span className="shrink-0 font-mono text-sm font-medium text-ink-soft">
                  ${item.monto.toLocaleString("es-CO")}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      {state.error && (
        <p className="text-sm text-alert" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="press self-start">
        {isPending ? "Revisando…" : "Ver resultado"}
      </Button>
    </form>
  );
}
