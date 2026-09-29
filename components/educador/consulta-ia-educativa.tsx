"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { EstudianteEducativo } from "@/lib/educacion";
import {
  preguntarIAEducativa,
  type PreguntaEducativaState,
} from "@/app/dashboard/educador/reportes/actions";

const ESTADO_VACIO: PreguntaEducativaState = {};

export function ConsultaIAEducativa({
  estudiantes,
}: {
  estudiantes: EstudianteEducativo[];
}) {
  const [state, formAction, isPending] = useActionState(
    preguntarIAEducativa,
    ESTADO_VACIO,
  );

  return (
    <div className="flex flex-col gap-4">
      <form
        action={formAction}
        className="flex flex-col gap-4 rounded-2xl border border-line bg-paper-raised p-4"
      >
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Estudiante o grupo
          <select
            name="estudiante_id"
            defaultValue=""
            className="h-11 rounded-lg border border-line bg-paper-raised px-3"
          >
            <option value="">Todo mi grupo</option>
            {estudiantes.map((estudiante) => (
              <option
                key={estudiante.estudiante_id}
                value={estudiante.estudiante_id}
              >
                {estudiante.nombre} · {estudiante.curso ?? "Sin curso"}
              </option>
            ))}
          </select>
        </label>
        <label
          htmlFor="pregunta-educativa"
          className="flex flex-col gap-1.5 text-sm font-medium text-ink"
        >
          Consulta pedagógica
          <textarea
            id="pregunta-educativa"
            name="pregunta"
            required
            minLength={12}
            maxLength={500}
            placeholder="¿Qué conceptos convendría repasar con este grupo?"
            className="min-h-28 rounded-xl border border-line bg-paper-raised px-3 py-2 text-sm text-ink"
          />
        </label>
        <Button type="submit" disabled={isPending} className="self-start">
          {isPending ? "Preparando sugerencias…" : "Consultar IA educativa"}
        </Button>
      </form>

      {state.error && (
        <p role="alert" className="text-sm text-alert">
          {state.error}
        </p>
      )}
      {state.respuesta && (
        <article
          className="game-card flex flex-col gap-3 rounded-2xl bg-paper-raised p-4"
          aria-live="polite"
        >
          <h2 className="font-display text-xl font-semibold text-ink">
            Orientación pedagógica
          </h2>
          <section>
            <h3 className="font-semibold text-ink">Observación</h3>
            <p className="mt-1 text-sm text-ink-soft">
              {state.respuesta.observacion}
            </p>
          </section>
          <Listar
            titulo="Fortalezas observadas"
            items={state.respuesta.fortalezas}
          />
          <Listar
            titulo="Aspectos por reforzar"
            items={state.respuesta.aspectos_por_reforzar}
          />
          <Listar
            titulo="Recomendaciones"
            items={state.respuesta.recomendaciones}
          />
          <Listar
            titulo="Estrategias de clase"
            items={state.respuesta.actividades_sugeridas}
          />
          <p className="text-xs text-ink-soft">
            Las sugerencias son apoyo pedagógico generado por IA, no una
            evaluación clínica ni hechos verificados.
          </p>
        </article>
      )}
    </div>
  );
}

function Listar({ titulo, items }: { titulo: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <h3 className="font-semibold text-ink">{titulo}</h3>
      <ul className="mt-1 list-disc pl-5 text-sm text-ink-soft">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
