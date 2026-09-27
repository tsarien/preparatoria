"use client";

import { useActionState } from "react";
import { simularTransaccion, type BilleteraState } from "./actions";
import { Button } from "@/components/ui/button";

const ESTADO_INICIAL: BilleteraState = {};

export function BilleteraForm() {
  const [state, formAction, isPending] = useActionState(
    simularTransaccion,
    ESTADO_INICIAL,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="tipo" className="text-xs font-medium text-ink-soft">
            Tipo
          </label>
          <select
            id="tipo"
            name="tipo"
            defaultValue="gasto"
            className="h-11 rounded-xl border-2 border-line bg-paper px-3 text-sm text-ink outline-none focus-visible:border-gold"
          >
            <option value="ingreso">Ingreso</option>
            <option value="gasto">Gasto</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="monto" className="text-xs font-medium text-ink-soft">
            Monto (COP)
          </label>
          <input
            id="monto"
            name="monto"
            type="number"
            min="1"
            step="1"
            required
            placeholder="20000"
            inputMode="numeric"
            className="h-11 rounded-xl border-2 border-line bg-paper px-3 font-mono text-sm text-ink outline-none focus-visible:border-gold"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="categoria"
          className="text-xs font-medium text-ink-soft"
        >
          Categoría (opcional)
        </label>
        <input
          id="categoria"
          name="categoria"
          type="text"
          placeholder="transporte, comida, salario…"
          className="h-11 rounded-xl border-2 border-line bg-paper px-3 text-sm text-ink outline-none focus-visible:border-gold"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="descripcion"
          className="text-xs font-medium text-ink-soft"
        >
          Descripción (opcional)
        </label>
        <input
          id="descripcion"
          name="descripcion"
          type="text"
          className="h-11 rounded-xl border-2 border-line bg-paper px-3 text-sm text-ink outline-none focus-visible:border-gold"
        />
      </div>

      {state.error && (
        <p className="text-sm text-alert" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="press self-start">
        {isPending ? "Registrando…" : "Registrar transacción"}
      </Button>
    </form>
  );
}
