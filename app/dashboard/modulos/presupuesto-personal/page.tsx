import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ICONO_MODULO } from "@/components/encabezado-pagina";
import { GameModuleShell } from "@/components/game/game-module-shell";
import { GameMissionHeader } from "@/components/game/game-mission-header";
import { RetoLista } from "@/components/reto-lista";
import type { Modulo, Reto, ProgresoUsuarioReto } from "@/types/database";

type RetoResumen = Pick<
  Reto,
  "id" | "slug" | "nombre" | "dificultad" | "orden"
>;
type ProgresoResumen = Pick<
  ProgresoUsuarioReto,
  "reto_id" | "estado" | "puntaje"
>;

export default async function ModuloPresupuestoPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: modulo } = await supabase
    .from("modulos")
    .select("id, nombre, descripcion")
    .eq("slug", "presupuesto-personal")
    .single<Pick<Modulo, "id" | "nombre" | "descripcion">>();

  const { data: retos } = modulo
    ? await supabase
        .from("retos")
        .select("id, slug, nombre, dificultad, orden")
        .eq("modulo_id", modulo.id)
        .order("orden")
        .returns<RetoResumen[]>()
    : { data: [] as RetoResumen[] };

  const { data: progresos } = await supabase
    .from("progreso_usuario_reto")
    .select("reto_id, estado, puntaje")
    .eq("usuario_id", user.id)
    .returns<ProgresoResumen[]>();

  const progresoPorReto = new Map((progresos ?? []).map((p) => [p.reto_id, p]));

  const completados = (retos ?? []).filter(
    (reto) => progresoPorReto.get(reto.id)?.estado === "completado",
  ).length;

  return (
    <GameModuleShell>
      <GameMissionHeader
        volverHref="/dashboard"
        volverEtiqueta="Volver al mapa"
        categoria="Dinero"
        mision="Misión 01"
        titulo={modulo?.nombre ?? "Presupuesto personal"}
        tagline={
          modulo?.descripcion ??
          "Aprende a distribuir tu plata y a priorizar cuando no alcanza."
        }
        icono={ICONO_MODULO["presupuesto-personal"]}
        progreso={{ completados, total: retos?.length ?? 0 }}
      />
      <RetoLista
        retos={retos ?? []}
        progresoPorReto={progresoPorReto}
        basePath="/dashboard/modulos/presupuesto-personal"
      />
    </GameModuleShell>
  );
}
