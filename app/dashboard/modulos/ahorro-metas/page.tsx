import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EncabezadoPagina, ICONO_MODULO } from "@/components/encabezado-pagina";
import { RetoLista } from "@/components/reto-lista";
import type { Modulo, Reto, ProgresoUsuarioReto } from "@/types/database";

type RetoResumen = Pick<Reto, "id" | "slug" | "nombre" | "dificultad" | "orden">;
type ProgresoResumen = Pick<ProgresoUsuarioReto, "reto_id" | "estado" | "puntaje">;

export default async function ModuloAhorroPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: modulo } = await supabase
    .from("modulos")
    .select("id, nombre, descripcion")
    .eq("slug", "ahorro-metas")
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

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-12">
      <EncabezadoPagina
        volverHref="/dashboard"
        volverEtiqueta="Volver al dashboard"
        titulo={modulo?.nombre ?? "Ahorro con metas"}
        descripcion={modulo?.descripcion}
        icono={ICONO_MODULO["ahorro-metas"]}
      />

      <RetoLista
        retos={retos ?? []}
        progresoPorReto={progresoPorReto}
        basePath="/dashboard/modulos/ahorro-metas"
        etiquetaCompletado="Meta activa"
      />
    </main>
  );
}
