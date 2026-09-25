"use client";

import { useActionState } from "react";
import { enviarLecturaContrato, type LeerContratoState } from "./actions";
import { Button } from "@/components/ui/button";
import { FeedbackCard } from "@/components/feedback-card";
import type { Clausula, Pregunta } from "@/lib/contrato";

const ESTADO_INICIAL: LeerContratoState = {};

export function LeerContratoForm({ clausulas, preguntas }: { clausulas: Clausula[]; preguntas: Pregunta[] }) {
  const enviarConDatos = enviarLecturaContrato.bind(null, clausulas, preguntas);
  const [state, formAction, isPending] = useActionState(enviarConDatos, ESTADO_INICIAL);

  if (state.feedback) {
    return <FeedbackCard feedback={state.feedback} reciente />;
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h3 className="font-display text-base font-medium text-ink">El contrato</h3>
        <p className="text-xs text-ink-soft">
          Márcalas todas las que te parezcan cláusulas preocupantes o injustas.
        </p>
        <ul className="flex flex-col divide-y divide-line rounded-md border border-line bg-paper-raised">
          {clausulas.map((c) => (
            <li key={c.id} className="flex items-start gap-3 p-3">
              <input
                id={`clausula_${c.id}`}
                name="clausulas_preocupantes"
                value={c.id}
                type="checkbox"
                className="mt-1 h-4 w-4 accent-[var(--color-gold)]"
              />
              <label htmlFor={`clausula_${c.id}`} className="text-sm text-ink">
                {c.texto}
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="font-display text-base font-medium text-ink">Preguntas de comprensión</h3>
        {preguntas.map((p) => (
          <div key={p.id} className="flex flex-col gap-2">
            <p className="text-sm font-medium text-ink">{p.texto}</p>
            <div className="flex flex-col gap-1.5">
              {p.opciones.map((opcion, i) => (
                <label key={i} className="flex items-center gap-2 text-sm text-ink-soft">
                  <input type="radio" name={`pregunta_${p.id}`} value={i} required className="h-4 w-4" />
                  {opcion}
                </label>
              ))}
            </div>
          </div>
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
