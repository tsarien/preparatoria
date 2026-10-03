import { etiquetaMision } from "@/lib/modulos";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRetoPorSlug, getProgreso } from "@/lib/retos";
import { ICONO_MODULO } from "@/components/encabezado-pagina";
import { GameChallengeShell } from "@/components/game/game-challenge-shell";
import { EscenarioEstafa } from "./escenario-estafa";
import type { TutorFeedback } from "@/lib/ai/schemas/tutor";

interface EscenarioConfig {
  canal: string;
  remitente: string;
  mensaje_inicial: string;
  interactivo: boolean;
}

export default async function EscenarioEstafaPage({
  params,
}: {
  params: Promise<{ retoSlug: string }>;
}) {
  const { retoSlug } = await params;

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: reto } = await getRetoPorSlug(supabase, retoSlug);
  if (!reto) notFound();

  const progreso = (await getProgreso(supabase, user.id, reto.id)).data;
  const config = reto.config as EscenarioConfig;
  const completado = progreso?.estado === "completado";

  return (
    <GameChallengeShell
      volverHref="/dashboard/modulos/detectar-estafas"
      volverEtiqueta="Detectar estafas"
      categoria="Seguridad digital"
      mision={`${etiquetaMision("detectar-estafas")} · Escenario · ${config.canal.toUpperCase()}`}
      dificultad={reto.dificultad}
      titulo={reto.nombre}
      tagline="Algunos son estafas, otros no. Marca lo que veas y decide con criterio."
      icono={ICONO_MODULO["detectar-estafas"]}
      completado={completado}
      recompensaXp={10}
    >
      <div className="p-5 pt-0">
        <EscenarioEstafa
          retoSlug={retoSlug}
          canal={config.canal}
          remitente={config.remitente}
          mensajeInicial={config.mensaje_inicial}
          interactivo={config.interactivo}
          feedbackPrevio={
            completado ? (progreso.feedback_ia as TutorFeedback) : null
          }
        />
      </div>
    </GameChallengeShell>
  );
}
