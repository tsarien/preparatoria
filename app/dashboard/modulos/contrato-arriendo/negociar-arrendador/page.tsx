import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRetoPorSlug, getProgreso } from "@/lib/retos";
import { ICONO_MODULO } from "@/components/encabezado-pagina";
import { GameChallengeShell } from "@/components/game/game-challenge-shell";
import { ApartmentCard } from "@/components/game/apartment-card";
import { NegociacionArrendador } from "./negociacion-arrendador";
import type { TutorFeedback } from "@/lib/ai/schemas/tutor";

// Mismas constantes narrativas — coherencia visual con leer-contrato.
const APARTAMENTO = {
  canon: 900_000,
  ciudad: "Medellín · El Poblado",
  habitaciones: 2,
  banos: 1,
  serviciosIncluidos: false,
} as const;

export default async function NegociarArrendadorPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: reto } = await getRetoPorSlug(supabase, "negociar-arrendador");
  const progreso = reto
    ? (await getProgreso(supabase, user.id, reto.id)).data
    : null;
  const config = reto?.config as {
    mensaje_inicial?: string;
    punto_negociacion?: string;
  } | null;
  const completado = progreso?.estado === "completado";

  return (
    <GameChallengeShell
      volverHref="/dashboard/modulos/contrato-arriendo"
      volverEtiqueta="Contrato de arriendo"
      categoria="Vida independiente"
      mision="Desafío 2 de 2"
      dificultad={reto?.dificultad}
      titulo="Negocia con el arrendador"
      tagline={
        config?.punto_negociacion ??
        "Intenta mejorar una condición del contrato."
      }
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

        <NegociacionArrendador
          mensajeInicial={config?.mensaje_inicial ?? ""}
          feedbackPrevio={
            completado ? (progreso?.feedback_ia as TutorFeedback) : null
          }
        />
      </div>
    </GameChallengeShell>
  );
}
