import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProgreso } from "@/lib/retos";
import {
  esRetoPrimerEmpleo,
  type ConfigRetoPrimerEmpleo,
} from "@/lib/primer-empleo";
import { ICONO_MODULO } from "@/components/encabezado-pagina";
import { GameChallengeShell } from "@/components/game/game-challenge-shell";
import type { TutorFeedback } from "@/lib/ai/schemas/tutor";
import { PrimerEmpleoForm } from "./primer-empleo-form";

export default async function RetoPrimerEmpleoPage({
  params,
}: {
  params: Promise<{ retoSlug: string }>;
}) {
  const { retoSlug } = await params;
  if (!esRetoPrimerEmpleo(retoSlug)) notFound();

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: reto } = await supabase
    .from("retos")
    .select("id, nombre, dificultad, config")
    .eq("slug", retoSlug)
    .single<{
      id: string;
      nombre: string;
      dificultad: string;
      config: unknown;
    }>();
  if (!reto) notFound();

  const progreso = (await getProgreso(supabase, user.id, reto.id)).data;
  const completado = progreso?.estado === "completado";

  return (
    <GameChallengeShell
      volverHref="/dashboard/modulos/primer-empleo"
      volverEtiqueta="Primer empleo"
      categoria="Vida profesional"
      mision={`Reto · ${retoSlug.replaceAll("-", " ")}`}
      dificultad={reto.dificultad}
      titulo={reto.nombre}
      tagline="Practica con escenarios ficticios y decisiones informadas."
      icono={ICONO_MODULO["primer-empleo"]}
      completado={completado}
      recompensaXp={10}
    >
      <div className="p-5 pt-0">
        <PrimerEmpleoForm
          retoSlug={retoSlug}
          config={reto.config as ConfigRetoPrimerEmpleo}
          feedbackPrevio={
            completado ? (progreso.feedback_ia as TutorFeedback) : null
          }
        />
      </div>
    </GameChallengeShell>
  );
}
