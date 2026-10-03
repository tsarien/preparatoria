import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GameModuleShell } from "@/components/game/game-module-shell";
import { GameMissionHeader } from "@/components/game/game-mission-header";
import { Card } from "@/components/ui/card";
import { GameStateBadge } from "@/components/game/game-state-badge";
import { etiquetaMision } from "@/lib/modulos";

export default async function PrimerEmpleoPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: modulo } = await supabase
    .from("modulos")
    .select("id")
    .eq("slug", "primer-empleo")
    .maybeSingle<{ id: string }>();
  if (!modulo) notFound();

  const { data: retos } = await supabase
    .from("retos")
    .select("id, slug, nombre, dificultad, orden")
    .eq("modulo_id", modulo.id)
    .order("orden")
    .returns<
      {
        id: string;
        slug: string;
        nombre: string;
        dificultad: string;
        orden: number;
      }[]
    >();

  const retoIds = (retos ?? []).map((reto) => reto.id);
  const { data: progresos } = retoIds.length
    ? await supabase
        .from("progreso_usuario_reto")
        .select("reto_id, estado")
        .eq("usuario_id", user.id)
        .in("reto_id", retoIds)
        .returns<{ reto_id: string; estado: string }[]>()
    : { data: [] as { reto_id: string; estado: string }[] };

  const completados = new Set(
    (progresos ?? [])
      .filter((progreso) => progreso.estado === "completado")
      .map((progreso) => progreso.reto_id),
  );
  const retosConEstado = (retos ?? []).map((reto) => ({
    ...reto,
    completado: completados.has(reto.id),
  }));
  const totalCompletados = retosConEstado.filter(
    (reto) => reto.completado,
  ).length;

  return (
    <GameModuleShell>
      <GameMissionHeader
        volverHref="/dashboard"
        volverEtiqueta="Volver al mapa"
        categoria="Vida profesional"
        mision={etiquetaMision("primer-empleo")}
        titulo="Primer empleo"
        tagline="Practica cómo mostrar tus habilidades, revisar ofertas y prepararte para una entrevista."
        icono="/iconos/icono-empleo.png"
        progreso={{ completados: totalCompletados, total: retosConEstado.length }}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {retosConEstado.map((reto, indice) => (
          <Link
            key={reto.id}
            href={`/dashboard/modulos/primer-empleo/${reto.slug}`}
            className="group focus-visible:rounded-2xl"
          >
            <Card
              tone="game"
              className="flex h-full items-center gap-3 p-4 transition-transform group-hover:-translate-y-0.5"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-gold/60 bg-gold-soft font-display font-bold text-ink">
                {indice + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block wrap-break-word font-semibold text-ink">
                  {reto.nombre}
                </span>
                <span className="mt-1 block text-xs text-ink-soft">
                  Dificultad: {reto.dificultad}
                </span>
              </span>
              <GameStateBadge
                estado={reto.completado ? "completado" : "pendiente"}
              />
            </Card>
          </Link>
        ))}
      </div>

      <p className="text-xs leading-relaxed text-ink-soft">
        Los avisos y ofertas de esta simulación son ficticios. Para decisiones
        laborales reales, revisa las condiciones y las normas vigentes con una
        persona adulta de confianza.
      </p>
    </GameModuleShell>
  );
}
