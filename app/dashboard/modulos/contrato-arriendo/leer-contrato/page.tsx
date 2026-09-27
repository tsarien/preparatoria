import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRetoPorSlug, getProgreso } from "@/lib/retos";
import { ICONO_MODULO } from "@/components/encabezado-pagina";
import { GameChallengeShell } from "@/components/game/game-challenge-shell";
import { ApartmentCard } from "@/components/game/apartment-card";
import { FeedbackCard } from "@/components/feedback-card";
import { LeerContratoForm } from "./leer-contrato-form";
import type { Clausula, Pregunta } from "@/lib/contrato";
import type { TutorFeedback } from "@/lib/ai/schemas/tutor";

// Constantes narrativas del caso — NO vienen de la DB. Si cambia el seed del
// contrato (migración 0006), actualiza el canon aquí a mano.
const APARTAMENTO = {
  canon: 900_000,
  ciudad: "Medellín · El Poblado",
  habitaciones: 2,
  banos: 1,
  serviciosIncluidos: false,
} as const;

export default async function LeerContratoPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: reto } = await getRetoPorSlug(supabase, "leer-contrato");
  const progreso = reto
    ? (await getProgreso(supabase, user.id, reto.id)).data
    : null;
  const config = reto?.config as {
    clausulas?: Clausula[];
    preguntas?: Pregunta[];
  } | null;
  const clausulas = config?.clausulas ?? [];
  const preguntas = config?.preguntas ?? [];
  const completado = progreso?.estado === "completado";

  return (
    <GameChallengeShell
      volverHref="/dashboard/modulos/contrato-arriendo"
      volverEtiqueta="Contrato de arriendo"
      categoria="Vida independiente"
      mision="Desafío 1 de 2"
      dificultad={reto?.dificultad}
      titulo="Lee el contrato"
      tagline="Antes de firmar, revisa cada cláusula. Algunas no son justas."
      icono={ICONO_MODULO["contrato-arriendo"]}
      completado={completado}
      recompensaXp={10}
    >
      <div className="flex flex-col gap-5 p-5 pt-0">
        <ApartmentCard
          canon={APARTAMENTO.canon}
          ciudad={APARTAMENTO.ciudad}
          habitaciones={APARTAMENTO.habitaciones}
          banos={APARTAMENTO.banos}
          serviciosIncluidos={APARTAMENTO.serviciosIncluidos}
        />

        {completado ? (
          <FeedbackCard feedback={progreso.feedback_ia as TutorFeedback} />
        ) : (
          <LeerContratoForm clausulas={clausulas} preguntas={preguntas} />
        )}
      </div>
    </GameChallengeShell>
  );
}
