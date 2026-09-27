import {
  Briefcase,
  Home,
  UtensilsCrossed,
  ShoppingBasket,
  Bus,
  PiggyBank,
  Gamepad2,
  ShieldCheck,
  ShieldAlert,
  Gift,
  AlertTriangle,
  ShoppingBag,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Mapa categoría/origen → icono. Normalizado (minúsculas, sin acentos) para
 * tolerar variaciones del seed. Fallback `Wallet` — nunca revienta por una
 * categoría nueva.
 */
const ICONOS: Record<string, { Icon: LucideIcon; tone: Tone }> = {
  // Ingresos
  salario: { Icon: Briefcase, tone: "growth" },
  estafa_evitada: { Icon: ShieldCheck, tone: "growth" },
  ahorro: { Icon: PiggyBank, tone: "gold" },
  ahorro_meta: { Icon: PiggyBank, tone: "gold" },
  // Gastos — alineados con las categorías del seed de presupuesto
  vivienda: { Icon: Home, tone: "alert" },
  arriendo: { Icon: Home, tone: "alert" },
  comida: { Icon: UtensilsCrossed, tone: "alert" },
  alimentacion: { Icon: UtensilsCrossed, tone: "alert" },
  mercado: { Icon: ShoppingBasket, tone: "alert" },
  transporte: { Icon: Bus, tone: "alert" },
  ocio: { Icon: Gamepad2, tone: "alert" },
  prioridades: { Icon: ShoppingBag, tone: "alert" },
  // Eventos
  factura_inesperada: { Icon: AlertTriangle, tone: "alert" },
  imprevisto_medico: { Icon: AlertTriangle, tone: "alert" },
  bono_inesperado: { Icon: Gift, tone: "growth" },
  oferta_sospechosa: { Icon: ShieldAlert, tone: "alert" },
};

type Tone = "growth" | "alert" | "gold" | "ink";

function normalizar(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

const TONE_ICON: Record<Tone, string> = {
  growth: "border-growth/40 bg-growth-soft text-growth",
  alert: "border-alert/40 bg-alert-soft text-alert",
  gold: "border-gold bg-gold-soft text-ink",
  ink: "border-line bg-paper text-ink-soft",
};

const TONE_AMOUNT: Record<Tone, string> = {
  growth: "text-growth",
  alert: "text-alert",
  gold: "text-ink",
  ink: "text-ink-soft",
};

interface TransactionRowProps {
  tipo: "ingreso" | "gasto";
  monto: number;
  categoria: string | null;
  descripcion: string | null;
  fecha: string;
  /** Distingue movimientos de ahorro (que cuentan como gasto pero se muestran con acento). */
  esAhorro?: boolean;
}

/**
 * Fila de movimiento — icono, categoría, descripción, fecha y monto.
 * Presentación pura: no evalúa ni agrupa nada.
 */
export function TransactionRow({
  tipo,
  monto,
  categoria,
  descripcion,
  fecha,
  esAhorro = false,
}: TransactionRowProps) {
  const catNorm = normalizar(categoria);
  const config = ICONOS[catNorm];
  const Icon = config?.Icon ?? Wallet;
  const tone: Tone = esAhorro
    ? "gold"
    : (config?.tone ?? (tipo === "ingreso" ? "growth" : "alert"));

  const fechaCorta = new Date(fecha).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
  });
  const signo = tipo === "ingreso" ? "+" : "−";

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span
        aria-hidden="true"
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2",
          TONE_ICON[tone],
        )}
      >
        <Icon className="h-4 w-4" />
      </span>

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="break-words text-sm font-medium text-ink">
          {descripcion ||
            categoria ||
            (tipo === "ingreso" ? "Ingreso" : "Gasto")}
        </span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-ink-soft">
          {categoria && (
            <span className="rounded-full border border-line bg-paper px-1.5 py-0.5 font-mono">
              {categoria}
            </span>
          )}
          <span>{fechaCorta}</span>
        </span>
      </div>

      <span
        className={cn(
          "shrink-0 whitespace-nowrap font-mono text-sm font-semibold",
          TONE_AMOUNT[tone],
        )}
      >
        {signo}${monto.toLocaleString("es-CO")}
      </span>
    </li>
  );
}
