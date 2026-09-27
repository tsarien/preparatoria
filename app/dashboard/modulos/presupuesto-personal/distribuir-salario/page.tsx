import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRetoPorSlug, getProgreso } from "@/lib/retos";
import { ICONO_MODULO } from "@/components/encabezado-pagina";
import { GameChallengeShell } from "@/components/game/game-challenge-shell";
import { FeedbackCard } from "@/components/feedback-card";
import { DistribuirSalarioForm } from "./distribuir-salario-form";
import type { TutorFeedback } from "@/lib/ai/schemas/tutor";

export default async function DistribuirSalarioPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: reto } = await getRetoPorSlug(supabase, "distribuir-salario");
  const { data: personaje } = await supabase
    .from("personajes")
    .select("salario_mensual")
    .eq("usuario_id", user.id)
    .single<{ salario_mensual: number }>();

  const progreso = reto
    ? (await getProgreso(supabase, user.id, reto.id)).data
    : null;
  const categorias =
    (reto?.config as { categorias?: string[] } | null)?.categorias ?? [];
  const completado = progreso?.estado === "completado";

  return (
    <GameChallengeShell
      volverHref="/dashboard/modulos/presupuesto-personal"
      volverEtiqueta="Presupuesto personal"
      categoria="Dinero"
      mision="Desafío 1 de 3"
      dificultad={reto?.dificultad}
      titulo="Distribuye tu primer salario"
      tagline="Reparte tu salario entre las categorías — la suma tiene que calzar exacto."
      icono={ICONO_MODULO["presupuesto-personal"]}
      completado={completado}
      recompensaXp={10}
    >
      <div className="p-5 pt-0">
        {completado ? (
          <FeedbackCard feedback={progreso.feedback_ia as TutorFeedback} />
        ) : (
          <DistribuirSalarioForm
            categorias={categorias}
            salarioMensual={personaje?.salario_mensual ?? 0}
          />
        )}
      </div>
    </GameChallengeShell>
  );
}
