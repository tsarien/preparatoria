import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface GamePanelProps {
  titulo: string;
  Icon?: LucideIcon;
  /** Contenido a la derecha del título (badge, contador, chip). */
  headerRight?: ReactNode;
  /** Tinte del strip superior. */
  tone?: "primary" | "gold" | "growth" | "alert";
  children: ReactNode;
  className?: string;
}

const STRIP_TONES = {
  primary: "from-primary-soft via-paper-raised to-paper-raised",
  gold: "from-gold-soft via-paper-raised to-primary-soft",
  growth: "from-growth-soft via-paper-raised to-paper-raised",
  alert: "from-alert-soft via-paper-raised to-paper-raised",
};

const ICON_TONES = {
  primary: "text-primary",
  gold: "text-gold",
  growth: "text-growth",
  alert: "text-alert",
};

/**
 * Sección con cabecera + cuerpo. Reemplaza el patrón que hoy vive inline en
 * billetera, ranking, eventos, contract-document y otros.
 */
export function GamePanel({
  titulo,
  Icon,
  headerRight,
  tone = "primary",
  children,
  className,
}: GamePanelProps) {
  return (
    <section
      className={cn(
        "game-edge overflow-hidden rounded-2xl border-line bg-paper-raised",
        className,
      )}
    >
      <header
        className={cn(
          "flex items-center justify-between gap-3 border-b-2 border-line bg-gradient-to-r px-4 py-3",
          STRIP_TONES[tone],
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          {Icon && (
            <Icon
              className={cn("h-4 w-4 shrink-0", ICON_TONES[tone])}
              aria-hidden="true"
            />
          )}
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-ink">
            {titulo}
          </h2>
        </div>
        {headerRight}
      </header>
      {children}
    </section>
  );
}
