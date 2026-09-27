"use client";

import { useActionState, useMemo, useState } from "react";
import { Check, Wallet } from "lucide-react";
import { enviarPriorizacion, type PriorizarGastosState } from "./actions";
import { Button } from "@/components/ui/button";
import { FeedbackCard } from "@/components/feedback-card";
import { cn } from "@/lib/utils";
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
  const [state, formAction, isPending] = useActionState(
    enviarConDatos,
    ESTADO_INICIAL,
  );
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());

  const total = useMemo(
    () =>
      items
        .filter((i) => seleccionados.has(i.id))
        .reduce((sum, i) => sum + i.monto, 0),
    [items, seleccionados],
  );
  const restante = presupuesto - total;
  const pctUsado =
    presupuesto > 0 ? Math.min(100, (total / presupuesto) * 100) : 0;

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

  const pasado = restante < 0;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {/* Panel de presupuesto — el "corazón" de la decisión */}
      <div className="game-card flex flex-col gap-3 rounded-2xl bg-paper-raised p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            Presupuesto disponible
          </span>
          <span
            className={cn(
              "font-mono text-lg font-semibold",
              pasado
                ? "text-alert"
                : restante === 0
                  ? "text-growth"
                  : "text-ink",
            )}
          >
            ${restante.toLocaleString("es-CO")}
          </span>
        </div>
        <div
          className="h-2.5 w-full overflow-hidden rounded-full border-2 border-ink/15 bg-ink/10"
          aria-hidden="true"
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-300",
              pasado
                ? "bg-alert"
                : restante === 0
                  ? "bg-growth"
                  : "bg-gradient-to-r from-primary to-[#00d9cc]",
            )}
            style={{ width: `${pctUsado}%` }}
          />
        </div>
        <p className="text-xs text-ink-soft">
          Has elegido{" "}
          <span className="font-mono font-medium text-ink">
            ${total.toLocaleString("es-CO")}
          </span>{" "}
          de{" "}
          <span className="font-mono font-medium text-ink">
            ${presupuesto.toLocaleString("es-CO")}
          </span>
        </p>
      </div>

      {/* Items */}
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

      <Button
        type="submit"
        disabled={isPending || pasado}
        className="press self-start"
      >
        {isPending ? "Enviando…" : "Confirmar elección"}
      </Button>
    </form>
  );
}
