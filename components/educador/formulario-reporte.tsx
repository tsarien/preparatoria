"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { EstudianteEducativo } from "@/lib/educacion";
import {
  generarReporteEducativo,
  type ReporteEducativoState,
} from "@/app/dashboard/educador/reportes/actions";

const ESTADO_VACIO: ReporteEducativoState = {};

export function FormularioReporte({
  estudiantes,
}: {
  estudiantes: EstudianteEducativo[];
}) {
  const [state, formAction, isPending] = useActionState(
    generarReporteEducativo,
    ESTADO_VACIO,
  );

  return (
    <div className="flex flex-col gap-5">
      <form
        action={formAction}
        className="grid grid-cols-1 gap-3 rounded-2xl border border-line bg-paper-raised p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          Periodo
          <input
            name="periodo"
            required
            maxLength={40}
            placeholder="Septiembre 2026"
            className="h-10 rounded-lg border border-line bg-paper-raised px-3"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          Estudiante
          <select
            name="estudiante_id"
            defaultValue=""
            className="h-10 rounded-lg border border-line bg-paper-raised px-3"
          >
            <option value="">Grupo completo</option>
            {estudiantes.map((estudiante) => (
              <option
                key={estudiante.estudiante_id}
                value={estudiante.estudiante_id}
              >
                {estudiante.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          Curso (opcional)
          <select
            name="curso"
            defaultValue=""
            className="h-10 rounded-lg border border-line bg-paper-raised px-3"
          >
            <option value="">Todos los cursos</option>
            {[
              ...new Set(
                estudiantes
                  .map((item) => item.curso)
                  .filter((curso): curso is string => Boolean(curso)),
              ),
            ].map((curso) => (
              <option key={curso} value={curso}>
                {curso}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Generando…" : "Generar / regenerar"}
          </Button>
        </div>
      </form>

      {state.error && (
        <p className="text-sm text-alert" role="alert">
          {state.error}
        </p>
      )}
      {state.reporte && (
        <article
          className="game-card flex flex-col gap-4 rounded-2xl bg-paper-raised p-4 sm:p-5"
          aria-live="polite"
        >
          <header>
            <p className="text-xs font-bold uppercase text-primary">
              Reporte de progreso
            </p>
            <h2 className="font-display text-xl font-semibold text-ink">
              {state.reporte.periodo}
              {state.reporte.curso ? ` · ${state.reporte.curso}` : " · Grupo"}
            </h2>
          </header>
          <section>
            <h3 className="font-semibold text-ink">Datos observados</h3>
            <p className="mt-1 text-sm text-ink-soft">
              Completó {state.reporte.observados.retos_completados} de{" "}
              {state.reporte.observados.total_retos} retos (
              {state.reporte.observados.progreso_promedio}% de progreso
              promedio).
            </p>
            <ul className="mt-2 list-disc pl-5 text-sm text-ink-soft">
              {state.reporte.observados.progreso_modulos.map((modulo) => (
                <li key={modulo.nombre}>
                  {modulo.nombre}: {modulo.completados} de {modulo.total} retos
                  ({modulo.porcentaje}%).
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-xl border border-turquoise/40 bg-turquoise-soft p-3">
            <h3 className="font-semibold text-ink">
              Interpretación y recomendaciones de IA
            </h3>
            <p className="mt-1 text-sm text-ink">
              {state.reporte.ia.observacion}
            </p>
            <Listar titulo="Fortalezas" items={state.reporte.ia.fortalezas} />
            <Listar
              titulo="Aspectos por reforzar"
              items={state.reporte.ia.aspectos_por_reforzar}
            />
            <Listar
              titulo="Recomendaciones"
              items={state.reporte.ia.recomendaciones}
            />
            <Listar
              titulo="Actividades sugeridas"
              items={state.reporte.ia.actividades_sugeridas}
            />
          </section>
        </article>
      )}
    </div>
  );
}

function Listar({ titulo, items }: { titulo: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3">
      <h4 className="text-sm font-semibold text-ink">{titulo}</h4>
      <ul className="mt-1 list-disc pl-5 text-sm text-ink">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
