import { FileText, AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Clausula } from "@/lib/contrato";

interface ContractDocumentProps {
  clausulas: Clausula[];
  seleccionadas: Set<string>;
  onToggle: (id: string) => void;
  disabled?: boolean;
}

/**
 * Presenta las cláusulas como un documento de contrato físico dentro del juego.
 * El input real (`name="clausulas_preocupantes"`) sigue existiendo para que la
 * Server Action reciba exactamente lo mismo — está `sr-only` y el label lo
 * envuelve, así el click en la tarjeta activa el checkbox.
 *
 * No sabe cuál cláusula es "preocupante" — eso lo decide el estudiante y evalúa
 * el backend. Presentación pura.
 */
export function ContractDocument({
  clausulas,
  seleccionadas,
  onToggle,
  disabled,
}: ContractDocumentProps) {
  return (
    <div className="game-card overflow-hidden rounded-2xl bg-paper-raised">
      {/* Cinta de "papel oficial" */}
      <div className="flex items-center justify-between gap-3 border-b-2 border-line bg-gradient-to-r from-gold-soft via-paper-raised to-primary-soft px-4 py-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="font-display text-sm font-semibold uppercase tracking-wider text-ink">
            Contrato de arrendamiento
          </span>
        </div>
        <span className="shrink-0 rounded-full border-2 border-gold bg-paper-raised px-2.5 py-0.5 font-mono text-[11px] font-semibold text-ink">
          {seleccionadas.size} / {clausulas.length}
        </span>
      </div>

      <p className="border-b border-line px-4 py-3 text-xs text-ink-soft">
        Léelo con calma. Marca las cláusulas que te parezcan{" "}
        <strong className="text-ink">preocupantes o injustas</strong>.
      </p>

      <ul className="flex flex-col divide-y divide-line">
        {clausulas.map((c, i) => {
          const activa = seleccionadas.has(c.id);
          return (
            <li
              key={c.id}
              className="animate-fade-up"
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            >
              <label
                className={cn(
                  "press flex cursor-pointer items-start gap-3 px-4 py-3.5 transition-colors duration-150",
                  activa ? "bg-gold-soft/60" : "hover:bg-primary-soft/40",
                  disabled && "cursor-not-allowed opacity-60",
                )}
              >
                <input
                  id={`clausula_${c.id}`}
                  name="clausulas_preocupantes"
                  value={c.id}
                  type="checkbox"
                  checked={activa}
                  onChange={() => !disabled && onToggle(c.id)}
                  disabled={disabled}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border-2",
                    activa
                      ? "border-gold bg-gold text-[#1f2430]"
                      : "border-line bg-paper",
                  )}
                >
                  {activa && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                    <span className="font-mono">
                      §{String(i + 1).padStart(2, "0")}
                    </span>
                  </p>
                  <p className="mt-0.5 break-words text-sm leading-relaxed text-ink">
                    {c.texto}
                  </p>
                </div>
                {activa && (
                  <AlertCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-alert"
                    aria-label="Marcada como preocupante"
                  />
                )}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
