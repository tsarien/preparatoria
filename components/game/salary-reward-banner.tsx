import { Sparkles } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface SalaryRewardBannerProps {
  monto: number;
  xp?: number;
  label?: string;
  className?: string;
}

/**
 * Banner de "recompensa recibida": presenta el salario como algo que acaba
 * de llegar, no como un dato en un formulario. Puramente presentación.
 */
export function SalaryRewardBanner({
  monto,
  xp = 10,
  label = "Tu primer salario",
  className,
}: SalaryRewardBannerProps) {
  return (
    <div
      className={cn(
        "game-card relative overflow-hidden rounded-2xl border-2 border-gold bg-gold-soft p-5",
        className,
      )}
    >
      {/* Halo radial dorado — refuerza "esto es un premio" */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold/25 blur-2xl"
      />

      <div className="relative flex items-center gap-4">
        <Image
          src="/iconos/icono-saldo.png"
          alt=""
          width={200}
          height={179}
          className="h-14 w-auto shrink-0 animate-pop sm:h-16"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            {label}
          </p>
          <p className="break-words font-mono text-2xl font-semibold leading-tight text-ink sm:text-3xl">
            ${monto.toLocaleString("es-CO")}
          </p>
          <span className="mt-1 inline-flex items-center gap-1 rounded-full border-2 border-gold bg-paper-raised px-2.5 py-0.5 font-mono text-[11px] font-semibold text-ink">
            <Sparkles className="h-3 w-3 text-gold" aria-hidden="true" />+{xp}{" "}
            XP
          </span>
        </div>
      </div>
    </div>
  );
}
