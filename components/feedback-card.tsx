import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export function FeedbackCard({ feedback }: { feedback: TutorFeedback }) {
  const tono = feedback.puntaje >= 70 ? "growth" : feedback.puntaje >= 40 ? "gold" : "alert";
  const celebra = feedback.puntaje >= 70;

  return (
    <Card className="border-2 border-ink/10" role="status" aria-live="polite">
      <CardContent className="flex flex-col gap-3 pt-5">
        <div className="flex items-center gap-3">
          <Image
            src={celebra ? "/mascota/mascota-celebrando.png" : "/mascota/mascota-pensativo.png"}
            alt=""
            width={320}
            height={315}
            className="h-14 w-auto shrink-0"
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
