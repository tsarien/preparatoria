import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRetoPorSlug, getProgreso } from "@/lib/retos";
import { ICONO_MODULO } from "@/components/encabezado-pagina";
import { GameChallengeShell } from "@/components/game/game-challenge-shell";
import { FeedbackCard } from "@/components/feedback-card";
import { PriorizarGastosForm } from "./priorizar-gastos-form";
import type { PriorizarGastosItem } from "@/lib/presupuesto";
import type { TutorFeedback } from "@/lib/ai/schemas/tutor";

export default async function PriorizarGastosPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: reto } = await getRetoPorSlug(supabase, "priorizar-gastos");
  const progreso = reto
    ? (await getProgreso(supabase, user.id, reto.id)).data
    : null;
  const config = reto?.config as {
    items?: PriorizarGastosItem[];
    presupuesto?: number;
  } | null;
  const items = config?.items ?? [];
  const presupuesto = config?.presupuesto ?? 0;
  const completado = progreso?.estado === "completado";

  return (
    <GameChallengeShell
      volverHref="/dashboard/modulos/presupuesto-personal"
      volverEtiqueta="Presupuesto personal"
      categoria="Dinero"
      mision="Desafío 3 de 3"
      dificultad={reto?.dificultad}
      titulo="Prioriza tus gastos"
      tagline={`Te sobró $${presupuesto.toLocaleString("es-CO")} este mes, pero quieres más de lo que te alcanza. Elige qué comprar.`}
      icono={ICONO_MODULO["presupuesto-personal"]}
      completado={completado}
      recompensaXp={10}
    >
      <div className="p-5 pt-0">
        {completado ? (
          <FeedbackCard feedback={progreso.feedback_ia as TutorFeedback} />
        ) : (
          <PriorizarGastosForm items={items} presupuesto={presupuesto} />
        )}
      </div>
    </GameChallengeShell>
  );
}
