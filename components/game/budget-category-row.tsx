import {
  Home,
  UtensilsCrossed,
  ShoppingBasket,
  Bus,
  PiggyBank,
  Gamepad2,
  ShieldAlert,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Mapa categoría → icono. Se busca por slug normalizado (minúsculas, sin acentos).
 * Si no encuentra match, cae en Wallet — nunca revienta por una categoría nueva.
 */
const ICONOS: Record<
  string,
  { Icon: LucideIcon; tone: "primary" | "growth" | "gold" | "alert" }
> = {
  vivienda: { Icon: Home, tone: "primary" },
  arriendo: { Icon: Home, tone: "primary" },
  casa: { Icon: Home, tone: "primary" },
  comida: { Icon: UtensilsCrossed, tone: "growth" },
  alimentacion: { Icon: UtensilsCrossed, tone: "growth" },
  mercado: { Icon: ShoppingBasket, tone: "growth" },
  transporte: { Icon: Bus, tone: "primary" },
  ahorro: { Icon: PiggyBank, tone: "gold" },
  ocio: { Icon: Gamepad2, tone: "primary" },
  emergencias: { Icon: ShieldAlert, tone: "alert" },
  emergencia: { Icon: ShieldAlert, tone: "alert" },
};

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function iconoDe(categoria: string) {
  return (
    ICONOS[normalizar(categoria)] ?? { Icon: Wallet, tone: "primary" as const }
  );
}

const TONES = {
  primary: "border-primary/40 bg-primary-soft text-primary",
  growth: "border-growth/40 bg-growth-soft text-growth",
  gold: "border-gold bg-gold-soft text-ink",
  alert: "border-alert/40 bg-alert-soft text-alert",
};

interface BudgetCategoryRowProps {
  categoria: string;
  valor: number;
  salarioTotal: number;
  onChange: (valor: number) => void;
}

/**
 * Fila de categoría para el reto de distribuir salario.
 * Icono + nombre + input + barra mini relativa al salario total.
 *
 * Presentación pura — el `name` del input se mantiene igual al original
 * (`monto_${categoria}`) para no romper la Server Action.
 */
export function BudgetCategoryRow({
  categoria,
  valor,
  salarioTotal,
  onChange,
}: BudgetCategoryRowProps) {
  const { Icon, tone } = iconoDe(categoria);
  const pct =
    salarioTotal > 0 ? Math.min(100, (valor / salarioTotal) * 100) : 0;
  const esAhorro = normalizar(categoria) === "ahorro";

  return (
    <div className="flex flex-col gap-2 rounded-xl border-2 border-line bg-paper-raised p-3">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-lg border-2",
            TONES[tone],
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <label
          htmlFor={`monto_${categoria}`}
          className="min-w-0 flex-1 break-words text-sm font-medium text-ink"
        >
          {categoria}
          {esAhorro && (
            <span className="ml-2 rounded-full bg-gold-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink">
              Recomendado
            </span>
          )}
        </label>
        <input
          id={`monto_${categoria}`}
          name={`monto_${categoria}`}
          type="number"
          min="0"
          step="1000"
          value={valor === 0 ? "" : valor}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          placeholder="0"
          inputMode="numeric"
          className="h-9 w-24 rounded-lg border-2 border-line bg-paper px-2 text-right font-mono text-sm text-ink outline-none focus-visible:border-gold sm:w-28"
        />
      </div>

      {/* Barra mini — el % que esta categoría se lleva del salario */}
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-ink/10"
        aria-hidden="true"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300",
            tone === "gold" && "bg-gold",
            tone === "growth" && "bg-growth",
            tone === "alert" && "bg-alert",
            tone === "primary" && "bg-primary",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
