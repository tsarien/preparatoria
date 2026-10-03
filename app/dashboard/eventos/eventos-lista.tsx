"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { resolverEventoAction } from "./actions";
import { esEventoPositivo } from "@/lib/eventos";
import type { EventoAleatorio } from "@/types/database";
import { EventCard, consecuencia } from "@/components/game/event-card";
import { cn } from "@/lib/utils";
import { lanzarConfeti } from "@/lib/celebrar";

interface Resultado {
  tipo: EventoAleatorio["tipo"];
  accion: "atender" | "ignorar";
  impacto: number;
  saldoAntes: number;
  saldoDespues: number;
}

interface EventosListaProps {
  eventosIniciales: EventoAleatorio[];
  /** Saldo actual del personaje — para animar el cambio tras resolver. */
  saldoInicial: number;
}

export function EventosLista({
  eventosIniciales,
  saldoInicial,
}: EventosListaProps) {
  const [eventos, setEventos] = useState(eventosIniciales);
  const [saldo, setSaldo] = useState(saldoInicial);
  const [pendiente, setPendiente] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [isPending, startTransition] = useTransition();
  const [saliendo, setSaliendo] = useState<Set<string>>(new Set());
  const [resueltos, setResueltos] = useState(0);

  function quitar(eventoId: string) {
    setEventos((prev) => prev.filter((e) => e.id !== eventoId));
    setSaliendo((prev) => {
      const siguiente = new Set(prev);
      siguiente.delete(eventoId);
      return siguiente;
    });
  }

  function resolver(eventoId: string, accion: "atender" | "ignorar") {
    setError(null);
    setResultado(null);
    setPendiente(eventoId);

    startTransition(async () => {
      const evento = eventos.find((e) => e.id === eventoId);
      const resultadoAccion = await resolverEventoAction(eventoId, accion);

      if (resultadoAccion.success) {
        // Delta de presentación — mismo cálculo que hace el SQL, solo para el banner.
        const positivo = evento ? esEventoPositivo(evento.tipo) : false;
        const aplica = accion === "atender";
        const delta = !aplica
          ? 0
          : positivo
            ? (evento?.impacto_monto ?? 0)
            : -(evento?.impacto_monto ?? 0);
        const saldoAntes = saldo;
        const saldoDespues = saldoAntes + delta;

        setSaldo(saldoDespues);
        setResultado({
          tipo: evento?.tipo ?? "factura_inesperada",
          accion,
          impacto: Math.abs(delta),
          saldoAntes,
          saldoDespues,
        });

        if (accion === "atender" && evento && esEventoPositivo(evento.tipo)) {
          void lanzarConfeti();
        }
        setResueltos((n) => n + 1);

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          quitar(eventoId);
        } else {
          setSaliendo((prev) => new Set(prev).add(eventoId));
          window.setTimeout(() => quitar(eventoId), 300);
        }
      } else {
        setError(resultadoAccion.error);
      }
      setPendiente(null);
    });
  }

  if (eventos.length === 0 && !resultado) {
    const atendiste = resueltos > 0;
    return (
      <div className="flex animate-fade-up flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-line p-8 text-center">
        <Image
          src={
            atendiste
              ? "/mascota/mascota-celebrando.png"
              : "/mascota/mascota-neutral.png"
          }
          alt=""
          width={320}
          height={315}
          className="h-20 w-auto animate-pop"
        />
        <p className="text-sm text-ink-soft">
          {atendiste
            ? "¡Listo! Atendiste todos tus eventos."
            : "No tienes eventos pendientes por ahora. Vuelve mañana."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Banner de cambio de saldo — aparece tras resolver */}
      {resultado && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "game-card flex flex-col gap-3 rounded-2xl border-2 p-4 animate-fade-up",
            resultado.tipo === "bono_inesperado"
              ? "border-growth/40 bg-growth-soft"
              : resultado.accion === "ignorar"
                ? "border-line bg-paper-raised"
                : "border-alert/40 bg-alert-soft",
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
              Decisión tomada
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border-2 border-gold bg-paper-raised px-2.5 py-0.5 font-mono text-[11px] font-semibold text-ink">
              <Sparkles className="h-3 w-3 text-gold" aria-hidden="true" />
              +5 XP
            </span>
          </div>

          {/* Animación de saldo */}
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="font-mono text-lg text-ink-soft line-through opacity-70">
              ${resultado.saldoAntes.toLocaleString("es-CO")}
            </span>
            <ArrowRight className="h-4 w-4 text-ink-soft" aria-hidden="true" />
            <span className="font-mono text-2xl font-bold text-ink">
              ${resultado.saldoDespues.toLocaleString("es-CO")}
            </span>
          </div>

          <p className="text-sm text-ink">
            {consecuencia(resultado.tipo, resultado.accion)}
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-alert" role="alert">
          {error}
        </p>
      )}

      {eventos.map((evento, i) => (
        <EventCard
          key={evento.id}
          evento={evento}
          onResolver={(accion) => resolver(evento.id, accion)}
          enProceso={isPending && pendiente === evento.id}
          saliendo={saliendo.has(evento.id)}
          index={i}
        />
      ))}
    </div>
  );
}
