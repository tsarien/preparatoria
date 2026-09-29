"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FeedbackCard } from "@/components/feedback-card";
import {
  CAMPOS_HOJA_VIDA,
  type ConfigRetoPrimerEmpleo,
  type RetoPrimerEmpleo,
} from "@/lib/primer-empleo";
import type { TutorFeedback } from "@/lib/ai/schemas/tutor";
import { completarRetoPrimerEmpleo, type PrimerEmpleoState } from "./actions";

const ESTADO_VACIO: PrimerEmpleoState = {};
const CAMPO_TEXTO =
  "min-h-24 w-full rounded-xl border border-line bg-paper-raised px-3 py-2 text-sm text-ink outline-none focus-visible:border-primary";

export function PrimerEmpleoForm({
  retoSlug,
  config,
  feedbackPrevio,
}: {
  retoSlug: RetoPrimerEmpleo;
  config: ConfigRetoPrimerEmpleo;
  feedbackPrevio: TutorFeedback | null;
}) {
  const accion = completarRetoPrimerEmpleo.bind(null, retoSlug);
  const [state, formAction, isPending] = useActionState(accion, ESTADO_VACIO);
  const feedback = state.feedback ?? feedbackPrevio;

  if (feedback)
    return (
      <FeedbackCard feedback={feedback} reciente={Boolean(state.feedback)} />
    );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {config.escenario && (
        <p className="rounded-xl border border-primary/30 bg-primary-soft p-3 text-sm text-ink">
          {config.escenario}
        </p>
      )}

      {retoSlug === "hoja-de-vida" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-soft">
            Construye un perfil sin datos de contacto. Proyectos académicos,
            cursos, voluntariados y habilidades también cuentan.
          </p>
          {CAMPOS_HOJA_VIDA.map((campo, indice) => (
            <label
              key={campo.id}
              htmlFor={campo.id}
              className="flex flex-col gap-1.5 text-sm font-medium text-ink"
            >
              {campo.label}
              <textarea
                id={campo.id}
                name={campo.id}
                placeholder={campo.placeholder}
                className={CAMPO_TEXTO}
                maxLength={500}
                required={indice < 3}
              />
            </label>
          ))}
        </div>
      )}

      {(retoSlug === "elegir-oferta" || retoSlug === "comparar-ofertas") && (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-sm font-semibold text-ink">
            {retoSlug === "elegir-oferta"
              ? "Elige una oferta"
              : "¿Cuál se ajusta mejor a tus prioridades?"}
          </legend>
          {config.ofertas?.map((oferta) => (
            <label
              key={oferta.id}
              className="game-edge flex cursor-pointer gap-3 rounded-xl border-line bg-paper-raised p-3 has-checked:border-primary has-checked:bg-primary-soft"
            >
              <input
                type="radio"
                name="oferta_id"
                value={oferta.id}
                required
                className="mt-1 h-4 w-4 shrink-0 accent-primary"
              />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">
                  {oferta.titulo}
                </span>
                <span className="mt-1 block text-sm text-ink-soft">
                  Salario: ${oferta.salario.toLocaleString("es-CO")} ·{" "}
                  {oferta.horario}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-ink-soft">
                  {oferta.requisitos} · {oferta.modalidad} · {oferta.ubicacion}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-ink-soft">
                  Beneficios: {oferta.beneficios} · Aprendizaje:{" "}
                  {oferta.aprendizaje}
                  {oferta.transporte && ` · Transporte: ${oferta.transporte}`}
                  {oferta.estabilidad &&
                    ` · Estabilidad: ${oferta.estabilidad}`}
                </span>
              </span>
            </label>
          ))}
          <label
            htmlFor="motivo"
            className="mt-2 flex flex-col gap-1.5 text-sm font-medium text-ink"
          >
            ¿Qué condiciones priorizaste y por qué?
            <textarea
              id="motivo"
              name="motivo"
              required
              minLength={20}
              maxLength={500}
              className={CAMPO_TEXTO}
            />
          </label>
        </fieldset>
      )}

      {retoSlug === "oferta-sospechosa" && (
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-semibold text-ink">
            Marca las señales de alerta
          </legend>
          <blockquote className="rounded-xl border border-alert/30 bg-alert-soft p-3 text-sm leading-relaxed text-ink">
            {config.oferta}
          </blockquote>
          {config.senales?.map((senal) => (
            <label
              key={senal.id}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-paper-raised p-3 text-sm text-ink"
            >
              <input
                type="checkbox"
                name="senal"
                value={senal.id}
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
              />
              <span>{senal.texto}</span>
            </label>
          ))}
        </fieldset>
      )}

      {retoSlug === "entrevista" && (
        <div className="flex flex-col gap-4">
          {config.preguntas?.map((pregunta, indice) => (
            <label
              key={pregunta}
              htmlFor={`respuesta_${indice + 1}`}
              className="flex flex-col gap-1.5 text-sm font-medium text-ink"
            >
              {pregunta}
              <textarea
                id={`respuesta_${indice + 1}`}
                name={`respuesta_${indice + 1}`}
                required
                minLength={12}
                maxLength={500}
                className={CAMPO_TEXTO}
              />
            </label>
          ))}
        </div>
      )}

      {config.nota && (
        <p className="rounded-xl border border-gold/40 bg-gold-soft p-3 text-xs leading-relaxed text-ink">
          {config.nota}
        </p>
      )}

      {state.error && (
        <p className="text-sm text-alert" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="press self-start">
        {isPending ? "Revisando…" : "Revisar mi respuesta"}
      </Button>
    </form>
  );
}
