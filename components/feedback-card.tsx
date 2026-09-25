"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { debeCelebrar, lanzarConfeti } from "@/lib/celebrar";
import type { TutorFeedback } from "@/lib/ai/schemas/tutor";

const CATEGORIA_LABEL: Record<string, string> = {
  ninguno: "Buena decisión",
  gasto_hormiga: "Gasto hormiga",
  no_prioriza_ahorro: "Priorizar el ahorro",
  sobregasto: "Sobregasto",
  desbalance_categorias: "Categorías desbalanceadas",
  no_detecta_senales_estafa: "No detectó las señales",
  confia_sin_verificar: "Confió sin verificar",
  otro: "Para revisar",
};

/**
 * `reciente` distingue una respuesta que el tutor acaba de dar (el estudiante
 * acaba de enviar su decisión) de una que solo se está mostrando de nuevo
 * desde el historial (ej. al volver a abrir un reto ya completado).
 *
 * Solo la reciente anima su entrada, hace "pop" con la mascota y, si el puntaje
 * es bueno, lanza confeti. Sin esta distinción, el confeti saltaría cada vez
 * que alguien abre una página con un reto ya hecho.
 */
export function FeedbackCard({ feedback, reciente = false }: { feedback: TutorFeedback; reciente?: boolean }) {
  const celebra = debeCelebrar(feedback.puntaje);
  const tono = celebra ? "growth" : feedback.puntaje >= 40 ? "gold" : "alert";

  // El ref evita un doble disparo: en desarrollo (Strict Mode) React ejecuta
  // los efectos dos veces, y el confeti saldría duplicado.
  const yaCelebro = useRef(false);
  const tarjeta = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!reciente || yaCelebro.current) return;
    yaCelebro.current = true;
    // Al reemplazar un formulario largo por la respuesta, en celular la tarjeta
    // puede quedar fuera de pantalla: la traemos a la vista solo si hace falta.
    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    tarjeta.current?.scrollIntoView({ behavior: reducido ? "auto" : "smooth", block: "nearest" });
    if (celebra) void lanzarConfeti();
  }, [reciente, celebra]);

  return (
    <Card ref={tarjeta} className={cn("border-2 border-ink/10", reciente && "animate-fade-up")} role="status" aria-live="polite">
      <CardContent className="flex flex-col gap-3 pt-5">
        <div className="flex items-center gap-3">
          <Image
            src={celebra ? "/mascota/mascota-celebrando.png" : "/mascota/mascota-pensativo.png"}
            alt=""
            width={320}
            height={315}
            className={cn("h-14 w-auto shrink-0", reciente && "animate-pop")}
          />
          <div className="flex flex-1 items-center justify-between gap-2">
            <span className="font-display text-sm font-medium uppercase tracking-wide text-ink-soft">
              Tu tutor IA dice
            </span>
            <span className="font-mono text-2xl font-semibold text-ink">{feedback.puntaje}/100</span>
          </div>
        </div>
        <p className="text-sm text-ink">{feedback.feedback}</p>
        <div>
          <Badge tone={tono}>{CATEGORIA_LABEL[feedback.categoria_error] ?? feedback.categoria_error}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
