"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { resolverEventoAction } from "./actions";
import { esEventoPositivo, puedeIgnorarse } from "@/lib/eventos";
import type { EventoAleatorio } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { lanzarConfeti } from "@/lib/celebrar";

const ETIQUETA_TIPO: Record<string, string> = {
  factura_inesperada: "Factura inesperada",
  imprevisto_medico: "Imprevisto médico",
  bono_inesperado: "Bono inesperado",
  oferta_sospechosa: "Oferta sospechosa",
};

const ICONO_TIPO: Record<string, string> = {
  factura_inesperada: "/iconos/eventos/icono-evento-factura.png",
  imprevisto_medico: "/iconos/eventos/icono-evento-imprevisto.png",
  bono_inesperado: "/iconos/eventos/icono-evento-bono.png",
  oferta_sospechosa: "/iconos/eventos/icono-evento-alerta.png",
};

export function EventosLista({ eventosIniciales }: { eventosIniciales: EventoAleatorio[] }) {
  const [eventos, setEventos] = useState(eventosIniciales);
  const [pendiente, setPendiente] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // Solo presentación: tarjetas que se están yendo (para animar la salida) y cuántos
  // eventos se resolvieron en esta visita (para elegir la reacción del estado vacío).
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
    setPendiente(eventoId);
    startTransition(async () => {
      const resultado = await resolverEventoAction(eventoId, accion);
      if (resultado.success) {
        const evento = eventos.find((e) => e.id === eventoId);
        if (accion === "atender" && evento && esEventoPositivo(evento.tipo)) void lanzarConfeti();
        setResueltos((n) => n + 1);
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          quitar(eventoId);
        } else {
          setSaliendo((prev) => new Set(prev).add(eventoId));
          window.setTimeout(() => quitar(eventoId), 300);
        }
      } else {
        setError(resultado.error);
      }
      setPendiente(null);
    });
  }

  if (eventos.length === 0) {
    const atendiste = resueltos > 0;
    return (
      <div className="flex animate-fade-up flex-col items-center gap-3 rounded-2xl border border-dashed border-line p-8 text-center">
        <Image
          src={atendiste ? "/mascota/mascota-celebrando.png" : "/mascota/mascota-neutral.png"}
          alt=""
          width={320}
          height={315}
          className="h-20 w-auto animate-pop"
        />
        <p className="text-sm text-ink-soft">
          {atendiste ? "¡Listo! Atendiste todos tus eventos." : "No tienes eventos pendientes por ahora. Vuelve mañana 👋"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="text-sm text-alert" role="alert">
          {error}
        </p>
      )}
      {eventos.map((evento, i) => {
        const positivo = esEventoPositivo(evento.tipo);
        const ignorable = puedeIgnorarse(evento.tipo);
        const enProceso = isPending && pendiente === evento.id;
        const seVa = saliendo.has(evento.id);
        return (
          <Card
            key={evento.id}
            className={cn(seVa ? "animate-exit" : "animate-fade-up", positivo && "border-growth/40")}
            style={seVa ? undefined : { animationDelay: `${Math.min(i, 8) * 70}ms` }}
          >
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                <div className="flex items-center gap-3">
                  <Image
                    src={ICONO_TIPO[evento.tipo]}
                    alt=""
                    width={200}
                    height={160}
                    className="h-12 w-auto shrink-0 sm:h-14"
                  />
                  <Badge tone="ink">{ETIQUETA_TIPO[evento.tipo] ?? evento.tipo}</Badge>
                </div>
                <span className={`shrink-0 whitespace-nowrap font-mono text-sm font-medium ${positivo ? "text-growth" : "text-alert"}`}>
                  {positivo ? "+" : "−"}${evento.impacto_monto.toLocaleString("es-CO")}
                </span>
              </div>
              <p className="text-sm text-ink">{evento.descripcion}</p>
              <div className="flex gap-2">
                <Button size="sm" className="press" onClick={() => resolver(evento.id, "atender")} disabled={enProceso}>
                  {enProceso ? "…" : positivo ? "Recibir" : "Atender"}
                </Button>
                {ignorable && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="press"
                    onClick={() => resolver(evento.id, "ignorar")}
                    disabled={enProceso}
                  >
                    Ignorar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
