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

export default async function ModuloContratoPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: modulo } = await supabase
    .from("modulos")
    .select("id, nombre, descripcion")
    .eq("slug", "contrato-arriendo")
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

  const completados = [...progresoPorReto.values()].filter(
    (p) => p.estado === "completado",
  ).length;

  return (
    <GameModuleShell>
      <GameMissionHeader
        volverHref="/dashboard"
        volverEtiqueta="Volver al mapa"
        categoria="Vida independiente"
        mision="Misión 03"
        titulo={modulo?.nombre ?? "Contrato de arriendo"}
        tagline={
          modulo?.descripcion ??
          "Aprende a leer un contrato y a negociar antes de firmar."
        }
        icono={ICONO_MODULO["contrato-arriendo"]}
        progreso={{ completados, total: retos?.length ?? 0 }}
      />
      <RetoLista
        retos={retos ?? []}
        progresoPorReto={progresoPorReto}
        basePath="/dashboard/modulos/contrato-arriendo"
      />
    </GameModuleShell>
  );
}
