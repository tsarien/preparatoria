import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRetoPorSlug, getProgreso } from "@/lib/retos";
import { ICONO_MODULO } from "@/components/encabezado-pagina";
import { GameChallengeShell } from "@/components/game/game-challenge-shell";
import { CrearMetaForm } from "./crear-meta-form";
import { MetaTracker } from "./meta-tracker";
import type { MetaAhorro } from "@/types/database";
import type { TutorFeedback } from "@/lib/ai/schemas/tutor";

export default async function MetaDeAhorroPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: personaje } = await supabase
    .from("personajes")
    .select("id, saldo_billetera")
    .eq("usuario_id", user.id)
    .single<{ id: string; saldo_billetera: number }>();

  const { data: meta } = personaje
    ? await supabase
        .from("metas_ahorro")
        .select("*")
        .eq("personaje_id", personaje.id)
        .maybeSingle<MetaAhorro>()
    : { data: null };

  const { data: reto } = await getRetoPorSlug(supabase, "meta-de-ahorro");
  const progreso = reto
    ? (await getProgreso(supabase, user.id, reto.id)).data
    : null;
  const feedbackPrevio =
    progreso?.estado === "completado"
      ? (progreso.feedback_ia as TutorFeedback)
      : null;
  const completado = progreso?.estado === "completado";

  return (
    <GameChallengeShell
      volverHref="/dashboard/modulos/ahorro-metas"
      volverEtiqueta="Ahorro con metas"
      categoria="Dinero"
      mision="Misión única"
      dificultad={reto?.dificultad}
      titulo={meta ? meta.nombre : "Crea tu meta de ahorro"}
      tagline={
        meta
          ? "Tu plan de ahorro está activo. Cada aporte te acerca más."
          : "Elige una meta realista según tu salario, y un plan de cuánto apartar cada mes."
      }
      icono={ICONO_MODULO["ahorro-metas"]}
      completado={completado}
      recompensaXp={10}
    >
      <div className="p-5 pt-0">
        {meta ? (
          <MetaTracker
            metaInicial={meta}
            saldoDisponible={personaje?.saldo_billetera ?? 0}
            feedbackPrevio={feedbackPrevio}
          />
        ) : (
          <CrearMetaForm />
        )}
      </div>
    </GameChallengeShell>
  );
}
