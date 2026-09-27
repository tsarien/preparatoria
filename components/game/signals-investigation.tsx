"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Link2,
  Clock,
  Gift,
  User,
  HelpCircle,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Señales genéricas de estafa — NO vienen de la DB (no son las `senales_clave`
 * del escenario, esas son la respuesta correcta y no deben revelarse).
 *
 * Son el "menú de sospechas" universal: el estudiante marca las que ve. La IA
 * recibe la selección como parte de su justificación y evalúa si acertó.
 */
export const SENALES_UNIVERSALES = [
  { id: "pide_dinero", label: "Pide dinero", Icon: AlertTriangle },
  { id: "enlace_raro", label: "Enlace sospechoso", Icon: Link2 },
  { id: "urgencia", label: "Usa urgencia", Icon: Clock },
  { id: "premio_inesperado", label: "Premio inesperado", Icon: Gift },
  { id: "pide_datos", label: "Pide datos personales", Icon: User },
  { id: "remitente_raro", label: "Remitente desconocido", Icon: HelpCircle },
] as const;

export type SenalId = (typeof SENALES_UNIVERSALES)[number]["id"];

interface SignalsInvestigationProps {
  seleccionadas: Set<SenalId>;
  onChange: (nuevas: Set<SenalId>) => void;
  disabled?: boolean;
}

/**
 * Panel de "¿qué señales encuentras?". Checkboxes con tarjeta visual seleccionable.
 * No sabe cuál es correcta — solo recoge la selección del estudiante.
 */
export function SignalsInvestigation({
  seleccionadas,
  onChange,
  disabled,
}: SignalsInvestigationProps) {
  function toggle(id: SenalId) {
    const next = new Set(seleccionadas);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-sm font-semibold text-ink">¿Qué señales encuentras?</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {SENALES_UNIVERSALES.map(({ id, label, Icon }) => {
          const activa = seleccionadas.has(id);
          return (
            <button
              key={id}
              type="button"
              role="checkbox"
              aria-checked={activa}
              disabled={disabled}
              onClick={() => toggle(id)}
              className={cn(
                "press flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-left text-sm font-medium transition-colors duration-150 disabled:opacity-50",
                activa
                  ? "border-gold bg-gold-soft text-ink"
                  : "border-line bg-paper-raised text-ink-soft hover:border-primary/40 hover:text-ink",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2",
                  activa
                    ? "border-gold bg-gold text-[#1f2430]"
                    : "border-line bg-paper text-ink-soft",
                )}
              >
                {activa ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
              </span>
              <span className="min-w-0 flex-1">{label}</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-ink-soft">
        Marca todas las que veas. No hay penalización por marcar de más.
      </p>
    </div>
  );
}

/** Convierte las señales seleccionadas a texto legible para la IA. */
export function describirSenales(seleccionadas: Set<SenalId>): string {
  if (seleccionadas.size === 0) return "No marcó ninguna señal.";
  const etiquetas = SENALES_UNIVERSALES.filter((s) =>
    seleccionadas.has(s.id),
  ).map((s) => s.label);
  return `Señales que marcó: ${etiquetas.join(", ")}.`;
}
