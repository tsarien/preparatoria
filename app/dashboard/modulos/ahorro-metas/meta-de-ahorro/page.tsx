import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRetoPorSlug, getProgreso } from "@/lib/retos";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { EncabezadoPagina, ICONO_MODULO } from "@/components/encabezado-pagina";
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
  const progreso = reto ? (await getProgreso(supabase, user.id, reto.id)).data : null;
  const feedbackPrevio = progreso?.estado === "completado" ? (progreso.feedback_ia as TutorFeedback) : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-6 py-12">
      <EncabezadoPagina
        volverHref="/dashboard/modulos/ahorro-metas"
        volverEtiqueta="Ahorro con metas"
        titulo={meta ? meta.nombre : "Crea tu meta de ahorro"}
        icono={ICONO_MODULO["ahorro-metas"]}
        variante="compacta"
      />

      <Card>
        {!meta && (
          <CardHeader>
            <CardTitle>Tu misión</CardTitle>
            <CardDescription>
              Define una meta realista según tu salario, y un plan de cuánto vas a aportar cada mes.
            </CardDescription>
          </CardHeader>
        )}
        <CardContent>
          {meta ? (
            <MetaTracker
              metaInicial={meta}
              saldoDisponible={personaje?.saldo_billetera ?? 0}
              feedbackPrevio={feedbackPrevio}
            />
          ) : (
            <CrearMetaForm />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
