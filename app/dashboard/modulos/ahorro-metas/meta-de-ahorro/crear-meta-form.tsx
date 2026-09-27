"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { crearMeta, type CrearMetaState } from "./actions";
import { Button } from "@/components/ui/button";
import { FeedbackCard } from "@/components/feedback-card";
import { marcarFeedbackReciente } from "@/lib/celebrar";

const ESTADO_INICIAL: CrearMetaState = {};

const SUGERENCIAS = [
  { label: "Cuota inicial de mi primer apartamento", monto: 20_000_000 },
  { label: "Viaje de egresados", monto: 3_000_000 },
  { label: "Mi primer carro", monto: 15_000_000 },
  { label: "Fondo de emergencia", monto: 2_000_000 },
];

export function CrearMetaForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    crearMeta,
    ESTADO_INICIAL,
  );
  const [nombre, setNombre] = useState(SUGERENCIAS[0].label);

  if (state.feedback) {
    return (
      <div className="flex flex-col gap-3">
        <FeedbackCard feedback={state.feedback} reciente />
        <Button
          type="button"
          variant="outline"
          className="press"
          onClick={() => router.refresh()}
        >
          Ver mi meta
        </Button>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      onSubmit={() => marcarFeedbackReciente("meta-de-ahorro")}
      className="flex flex-col gap-5"
    >
      <div className="flex flex-col gap-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
          Configuración de misión
        </p>
        <h3 className="font-display text-lg font-semibold text-ink sm:text-xl">
          ¿Para qué quieres ahorrar?
        </h3>
        <p className="text-sm text-ink-soft">
          Elige un nombre, un monto objetivo y cuánto puedes apartar cada mes.
        </p>
      </div>

      {/* Nombre + sugerencias */}
      <div className="flex flex-col gap-2">
        <label htmlFor="nombre" className="text-sm font-medium text-ink">
          Nombre de tu meta
        </label>
        <input
          id="nombre"
          name="nombre"
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          className="h-11 w-full rounded-xl border-2 border-line bg-paper px-3 text-sm text-ink outline-none focus-visible:border-gold"
        />
        <div className="flex flex-wrap gap-1.5">
          {SUGERENCIAS.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setNombre(s.label)}
              className="press rounded-full border border-line bg-paper-raised px-3 py-1 text-xs text-ink-soft transition-colors hover:border-primary/40 hover:text-ink"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cifras */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="monto_objetivo"
            className="text-sm font-medium text-ink"
          >
            Monto objetivo (COP)
          </label>
          <input
            id="monto_objetivo"
            name="monto_objetivo"
            type="number"
            min="1000"
            step="1000"
            placeholder="15000000"
            required
            className="h-11 w-full rounded-xl border-2 border-line bg-paper px-3 font-mono text-sm text-ink outline-none focus-visible:border-gold"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="aporte_mensual"
            className="text-sm font-medium text-ink"
          >
            Aporte mensual
          </label>
          <input
            id="aporte_mensual"
            name="aporte_mensual"
            type="number"
            min="1000"
            step="1000"
            placeholder="150000"
            required
            className="h-11 w-full rounded-xl border-2 border-line bg-paper px-3 font-mono text-sm text-ink outline-none focus-visible:border-gold"
          />
        </div>
      </div>

      {state.error && (
        <p className="text-sm text-alert" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="press self-start">
        {isPending ? "Creando…" : "Crear mi meta"}
      </Button>
    </form>
  );
}
