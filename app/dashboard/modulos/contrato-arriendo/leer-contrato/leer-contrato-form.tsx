"use client";

import { useActionState, useState } from "react";
import { HelpCircle } from "lucide-react";
import { enviarLecturaContrato, type LeerContratoState } from "./actions";
import { Button } from "@/components/ui/button";
import { FeedbackCard } from "@/components/feedback-card";
import { ContractDocument } from "@/components/game/contract-document";
import { cn } from "@/lib/utils";
import type { Clausula, Pregunta } from "@/lib/contrato";

const ESTADO_INICIAL: LeerContratoState = {};

export function LeerContratoForm({
  clausulas,
  preguntas,
}: {
  clausulas: Clausula[];
  preguntas: Pregunta[];
}) {
  const enviarConDatos = enviarLecturaContrato.bind(null, clausulas, preguntas);
  const [state, formAction, isPending] = useActionState(
    enviarConDatos,
    ESTADO_INICIAL,
  );
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());

  if (state.feedback) {
    return <FeedbackCard feedback={state.feedback} reciente />;
  }

  function toggle(id: string) {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <ContractDocument
        clausulas={clausulas}
        seleccionadas={seleccionadas}
        onToggle={toggle}
        disabled={isPending}
      />

      {/* Panel de preguntas de comprensión */}
      <div className="game-card flex flex-col gap-4 rounded-2xl bg-paper-raised p-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-primary" aria-hidden="true" />
          <p className="font-display text-sm font-semibold uppercase tracking-wider text-ink">
            Preguntas de comprensión
          </p>
        </div>

        {preguntas.map((p, i) => (
          <fieldset key={p.id} className="flex flex-col gap-2">
            <legend className="mb-1 break-words text-sm font-medium text-ink">
              <span className="mr-2 font-mono text-xs text-ink-soft">
                {String(i + 1).padStart(2, "0")}
              </span>
              {p.texto}
            </legend>
            <div className="flex flex-col gap-1.5">
              {p.opciones.map((opcion, idx) => (
                <label
                  key={idx}
                  className={cn(
                    "press flex cursor-pointer items-center gap-2.5 rounded-xl border-2 px-3 py-2 text-sm transition-colors duration-150",
                    "border-line bg-paper text-ink has-[:checked]:border-gold has-[:checked]:bg-gold-soft",
                  )}
                >
                  <input
                    type="radio"
                    name={`pregunta_${p.id}`}
                    value={idx}
                    required
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-ink/25 bg-paper peer-checked:border-gold"
                  />
                  <span className="min-w-0 flex-1 break-words">{opcion}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      {state.error && (
        <p className="text-sm text-alert" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="press self-start">
        {isPending ? "Revisando…" : "Enviar respuestas"}
      </Button>
    </form>
  );
}
