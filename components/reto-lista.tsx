import Image from "next/image";
import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { cn } from "@/lib/utils";

interface RetoItem {
  id: string;
  slug: string;
  nombre: string;
  dificultad: string;
}

interface ProgresoItem {
  estado: string;
  puntaje: number | null;
}

interface RetoListaProps {
  retos: RetoItem[];
  progresoPorReto: Map<string, ProgresoItem>;
  /** Ruta base del módulo, ej. "/dashboard/modulos/presupuesto-personal". */
  basePath: string;
  /** Texto de la pastilla cuando el reto está hecho (ej. "Meta activa"). */
  etiquetaCompletado?: string;
}

/**
 * Lista de retos de un módulo. Cada fila es una tarjeta-enlace: el número pasa
 * a un check al completarse, y el estado (pendiente / puntaje) va en la misma
 * línea que la dificultad — así en 320px nada compite por el ancho del título.
 *
 * Es la única "orquestación" de entrada de la pantalla: las filas aparecen
 * escalonadas una vez, al cargar. Nada más se mueve solo.
 */
export function RetoLista({ retos, progresoPorReto, basePath, etiquetaCompletado = "Completado" }: RetoListaProps) {
  if (retos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line p-8 text-center">
        <Image src="/mascota/mascota-pensativo.png" alt="" width={320} height={319} className="h-16 w-auto" />
        <p className="text-sm text-ink-soft">Este módulo todavía no tiene retos. Vuelve pronto.</p>
      </div>
    );
  }

  const completados = retos.filter((r) => progresoPorReto.get(r.id)?.estado === "completado").length;

  return (
    <div className="flex flex-col gap-4">
      {retos.length > 1 && (
        <ProgressBar value={completados} max={retos.length} label="Retos completados" animado />
      )}

      <ol className="flex flex-col gap-3">
        {retos.map((reto, i) => {
          const progreso = progresoPorReto.get(reto.id);
          const completado = progreso?.estado === "completado";
          return (
            <li key={reto.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 70}ms` }}>
              <Link href={`${basePath}/${reto.slug}`} className="group block rounded-2xl">
                <Card className={cn("lift", completado && "border-growth/40")}>
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          "grid h-9 w-9 shrink-0 place-items-center rounded-full font-mono text-sm",
                          completado ? "bg-growth-soft text-growth" : "bg-primary-soft text-primary"
                        )}
                      >
                        {completado ? <Check className="h-4 w-4" aria-hidden="true" /> : i + 1}
                      </span>
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className="break-words font-display text-base font-medium text-ink">{reto.nombre}</span>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-xs text-ink-soft">Dificultad: {reto.dificultad}</span>
                          {completado ? (
                            <Badge tone="growth">
                              {etiquetaCompletado} · {progreso?.puntaje}/100
                            </Badge>
                          ) : (
                            <Badge tone="ink">Pendiente</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-ink-soft transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </CardContent>
                </Card>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
