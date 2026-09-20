"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { crearMeta, type CrearMetaState } from "./actions";
import { Button } from "@/components/ui/button";
import { FeedbackCard } from "@/components/feedback-card";

const ESTADO_INICIAL: CrearMetaState = {};

export function CrearMetaForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(crearMeta, ESTADO_INICIAL);

  if (state.feedback) {
    return (
      <div className="flex flex-col gap-3">
        <FeedbackCard feedback={state.feedback} />
        <Button type="button" variant="outline" onClick={() => router.refresh()}>
          Ver mi meta
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nombre" className="text-sm font-medium text-ink">
          ¿Para qué estás ahorrando?
        </label>
        <input
          id="nombre"
          name="nombre"
          type="text"
          defaultValue="Cuota inicial de mi primer apartamento"
          required
          className="h-10 rounded-md border border-line bg-paper-raised px-3 text-sm text-ink outline-none focus-visible:border-gold"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="monto_objetivo" className="text-sm font-medium text-ink">
          Monto objetivo (COP)
        </label>
        <input
          id="monto_objetivo"
          name="monto_objetivo"
          type="number"
          min="1"
          step="1000"
          placeholder="15000000"
          required
          className="h-10 rounded-md border border-line bg-paper-raised px-3 text-sm text-ink outline-none focus-visible:border-gold"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="aporte_mensual" className="text-sm font-medium text-ink">
          ¿Cuánto planeas aportar cada mes?
        </label>
        <input
          id="aporte_mensual"
          name="aporte_mensual"
          type="number"
          min="1"
          step="1000"
          placeholder="150000"
          required
          className="h-10 rounded-md border border-line bg-paper-raised px-3 text-sm text-ink outline-none focus-visible:border-gold"
        />
      </div>

      {state.error && (
        <p className="text-sm text-alert" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Creando…" : "Crear meta"}
      </Button>
    </form>
  );
}
