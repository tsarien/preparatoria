"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { resolverEventoAction } from "./actions";
import { esEventoPositivo, puedeIgnorarse } from "@/lib/eventos";
import type { EventoAleatorio } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

  function resolver(eventoId: string, accion: "atender" | "ignorar") {
    setError(null);
    setPendiente(eventoId);
    startTransition(async () => {
      const resultado = await resolverEventoAction(eventoId, accion);
      if (resultado.success) {
        setEventos((prev) => prev.filter((e) => e.id !== eventoId));
      } else {
        setError(resultado.error);
      }
      setPendiente(null);
    });
  }

  if (eventos.length === 0) {
    return <p className="text-sm text-ink-soft">No tienes eventos pendientes por ahora. Vuelve mañana 👋</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="text-sm text-alert" role="alert">
          {error}
        </p>
      )}
      {eventos.map((evento) => {
        const positivo = esEventoPositivo(evento.tipo);
        const ignorable = puedeIgnorarse(evento.tipo);
        const enProceso = isPending && pendiente === evento.id;
        return (
          <Card key={evento.id}>
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Image
                    src={ICONO_TIPO[evento.tipo]}
                    alt=""
                    width={200}
                    height={160}
                    className="h-12 w-auto shrink-0"
                  />
                  <Badge tone="ink">{ETIQUETA_TIPO[evento.tipo] ?? evento.tipo}</Badge>
                </div>
                <span className={`font-mono text-sm font-medium ${positivo ? "text-growth" : "text-alert"}`}>
                  {positivo ? "+" : "−"}${evento.impacto_monto.toLocaleString("es-CO")}
                </span>
              </div>
              <p className="text-sm text-ink">{evento.descripcion}</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => resolver(evento.id, "atender")} disabled={enProceso}>
                  {enProceso ? "…" : positivo ? "Recibir" : "Atender"}
                </Button>
                {ignorable && (
                  <Button
                    size="sm"
                    variant="outline"
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
