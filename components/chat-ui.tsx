import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Burbuja de los chats de simulación (estafador, arrendador). Al montarse
 * entra con un fade-up corto: cada mensaje nuevo es un elemento nuevo, así que
 * la animación corre solo para el que acaba de llegar. Solo movimiento
 * vertical: un slide lateral podría generar scroll horizontal en 320px.
 */
export function BurbujaChat({ propia, children }: { propia: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        "max-w-[85%] animate-fade-up break-words rounded-2xl px-3.5 py-2 text-sm",
        propia
          ? "self-end rounded-br-md bg-ink text-paper"
          : "self-start rounded-bl-md border border-line bg-paper-raised text-ink"
      )}
    >
      {children}
    </div>
  );
}

/** Tres puntos "escribiendo…". Con movimiento reducido se quedan quietos. */
export function IndicadorEscribiendo() {
  return (
    <div className="animate-fade-up self-start rounded-2xl rounded-bl-md border border-line bg-paper-raised px-3.5 py-3">
      <span className="sr-only">Escribiendo…</span>
      <span className="flex gap-1" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-ink-soft motion-safe:animate-typing"
            style={{ animationDelay: `${i * 160}ms` }}
          />
        ))}
      </span>
    </div>
  );
}
