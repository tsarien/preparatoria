import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRetoPorSlug, getProgreso } from "@/lib/retos";
import { ICONO_MODULO } from "@/components/encabezado-pagina";
import { GameChallengeShell } from "@/components/game/game-challenge-shell";
import { FeedbackCard } from "@/components/feedback-card";
import { GastosHormigaForm } from "./gastos-hormiga-form";
import type { GastoHormigaItem } from "@/lib/presupuesto";
import type { TutorFeedback } from "@/lib/ai/schemas/tutor";

export default async function GastosHormigaPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: reto } = await getRetoPorSlug(supabase, "gastos-hormiga");
  const progreso = reto
    ? (await getProgreso(supabase, user.id, reto.id)).data
    : null;
  const items =
    (reto?.config as { items?: GastoHormigaItem[] } | null)?.items ?? [];
  const completado = progreso?.estado === "completado";

  return (
    <GameChallengeShell
      volverHref="/dashboard/modulos/presupuesto-personal"
      volverEtiqueta="Presupuesto personal"
      categoria="Dinero"
      mision="Desafío 2 de 3"
      dificultad={reto?.dificultad}
      titulo="Detecta los gastos hormiga"
      tagline="Marca los gastos pequeños, frecuentes y evitables que se comen tu plata."
      icono={ICONO_MODULO["presupuesto-personal"]}
      completado={progreso?.estado === "completado"}
      recompensaXp={10}
      recompensaDinero={41000}
    >
      <div className="p-5 pt-0">
        {progreso?.estado === "completado" ? (
          <FeedbackCard feedback={progreso.feedback_ia as TutorFeedback} />
        ) : (
          <GastosHormigaForm items={items} />
        )}
      </div>
    </GameChallengeShell>
  );
}
