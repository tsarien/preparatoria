import Image from "next/image";
import {
  AlertTriangle,
  Gift,
  Receipt,
  HeartPulse,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EventoAleatorio } from "@/types/database";

type TipoEvento = EventoAleatorio["tipo"];

interface EventoConfig {
  etiqueta: string;
  categoria: string;
  IconFallback: typeof AlertTriangle;
  tono: "growth" | "alert" | "gold" | "primary";
  /** Frase corta de "qué significa esto en tu vida" — presentación, no lógica. */
  contexto: string;
}

const CONFIG: Record<TipoEvento, EventoConfig> = {
  factura_inesperada: {
    etiqueta: "Factura inesperada",
    categoria: "Imprevisto",
    IconFallback: Receipt,
    tono: "alert",
    contexto: "Algo se dañó y hay que resolverlo antes de que empeore.",
  },
  imprevisto_medico: {
    etiqueta: "Imprevisto médico",
    categoria: "Salud",
    IconFallback: HeartPulse,
    tono: "alert",
    contexto: "Cosas de la vida — te tocó gastar sin haberlo planeado.",
  },
  bono_inesperado: {
    etiqueta: "Bono inesperado",
    categoria: "Ingreso extra",
    IconFallback: Gift,
    tono: "growth",
    contexto: "A veces el mundo te devuelve algo bueno. Aprovecha.",
  },
  oferta_sospechosa: {
    etiqueta: "Oferta sospechosa",
    categoria: "Alerta",
    IconFallback: ShieldCheck,
    tono: "gold",
    contexto: "Un mensaje prometiendo multiplicar tu plata. ¿Cae o no cae?",
  },
};

const ICONO_TIPO: Record<TipoEvento, string> = {
  factura_inesperada: "/iconos/eventos/icono-evento-factura.png",
  imprevisto_medico: "/iconos/eventos/icono-evento-imprevisto.png",
  bono_inesperado: "/iconos/eventos/icono-evento-bono.png",
  oferta_sospechosa: "/iconos/eventos/icono-evento-alerta.png",
};

/** Frase breve mostrada tras resolver — no contradice la descripción real. */
function consecuencia(tipo: TipoEvento, accion: "atender" | "ignorar"): string {
  if (tipo === "oferta_sospechosa" && accion === "ignorar") {
    return "Buena decisión — esa oferta no era confiable.";
  }
  if (tipo === "bono_inesperado") {
    return "Sumaste un ingreso extra a tu billetera.";
  }
  if (tipo === "imprevisto_medico") {
    return "Tuviste que gastar lo que no tenías planeado.";
  }
  if (tipo === "factura_inesperada") {
    return "Tu presupuesto del mes se redujo.";
  }
  return "Decisión tomada.";
}

const TONOS = {
  growth: {
    border: "border-growth/40",
    bg: "bg-growth-soft",
    text: "text-growth",
  },
  alert: { border: "border-alert/40", bg: "bg-alert-soft", text: "text-alert" },
  gold: { border: "border-gold", bg: "bg-gold-soft", text: "text-ink" },
  primary: {
    border: "border-primary/40",
    bg: "bg-primary-soft",
    text: "text-primary",
  },
};

interface EventCardProps {
  evento: EventoAleatorio;
  /** Suma que se va a aplicar al resolver — solo para mostrar el pronóstico. */
  onResolver: (accion: "atender" | "ignorar") => void;
  enProceso: boolean;
  /** Se está animando la salida (última transición antes de desaparecer). */
  saliendo: boolean;
  index?: number;
}

/**
 * Tarjeta de evento. Se presenta como "algo que le pasó a tu personaje" — no
 * como una notificación del sistema. El icono pixel-art grande ancla la
 * narrativa; los botones siguen siendo los dos reales de la RPC.
 */
export function EventCard({
  evento,
  onResolver,
  enProceso,
  saliendo,
  index = 0,
}: EventCardProps) {
  const config = CONFIG[evento.tipo as TipoEvento];
  const positivo = evento.tipo === "bono_inesperado";
  const ignorable = evento.tipo === "oferta_sospechosa";
  const tonos = TONOS[config.tono];

  return (
    <article
      className={cn(
        "game-card overflow-hidden rounded-2xl border-2 bg-paper-raised",
        saliendo ? "animate-exit" : "animate-fade-up",
        positivo && "border-growth/40",
        !positivo && !ignorable && "border-alert/40",
        ignorable && "border-gold",
      )}
      style={
        saliendo
          ? undefined
          : { animationDelay: `${Math.min(index, 8) * 70}ms` }
      }
    >
      {/* Cabecera: categoría + monto */}
      <header className="flex items-start justify-between gap-3 border-b-2 border-line bg-gradient-to-r from-paper-raised via-paper-raised to-primary-soft/40 px-4 py-2.5">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
          <config.IconFallback
            className={cn("h-3.5 w-3.5", tonos.text)}
            aria-hidden="true"
          />
          {config.categoria}
        </span>
        <span
          className={cn(
            "shrink-0 whitespace-nowrap font-mono text-sm font-semibold",
            positivo ? "text-growth" : "text-alert",
          )}
        >
          {positivo ? "+" : "−"}${evento.impacto_monto.toLocaleString("es-CO")}
        </span>
      </header>

      {/* Cuerpo: icono pixel-art + narrativa */}
      <div className="flex items-start gap-4 p-4">
        <Image
          src={ICONO_TIPO[evento.tipo as TipoEvento]}
          alt=""
          width={200}
          height={160}
          className="h-16 w-auto shrink-0 drop-shadow-md sm:h-20"
        />

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h3 className="break-words font-display text-base font-semibold leading-tight text-ink sm:text-lg">
            {config.etiqueta}
          </h3>
          <p className="break-words text-sm text-ink">{evento.descripcion}</p>
          <p className="text-xs italic text-ink-soft">{config.contexto}</p>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex flex-wrap gap-2 border-t-2 border-line px-4 py-3">
        <button
          type="button"
          onClick={() => onResolver("atender")}
          disabled={enProceso}
          className={cn(
            "press inline-flex h-9 items-center rounded-xl border-2 px-4 text-sm font-semibold shadow-[0_3px_0_rgba(31,36,48,0.2)] transition-transform duration-150 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 motion-reduce:transition-none",
            positivo
              ? "border-growth bg-growth text-white"
              : "border-gold bg-gold text-[#1f2430]",
          )}
        >
          {enProceso ? "…" : positivo ? "Recibir" : "Atender"}
        </button>

        {ignorable && (
          <button
            type="button"
            onClick={() => onResolver("ignorar")}
            disabled={enProceso}
            className="press inline-flex h-9 items-center rounded-xl border-2 border-line bg-paper-raised px-4 text-sm font-semibold text-ink shadow-[0_3px_0_rgba(31,36,48,0.12)] transition-transform duration-150 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 motion-reduce:transition-none"
          >
            Ignorar
          </button>
        )}
      </div>

      {/* Nota educativa en oferta_sospechosa — no revela la respuesta, pero deja el marco */}
      {ignorable && (
        <p className="border-t border-line bg-gold-soft/50 px-4 py-2 text-xs text-ink-soft">
          Ignorar una oferta sospechosa no cuesta nada. Atenderla sí.
        </p>
      )}
    </article>
  );
}

/** Texto de consecuencia para mostrar tras resolver. */
export { consecuencia };
