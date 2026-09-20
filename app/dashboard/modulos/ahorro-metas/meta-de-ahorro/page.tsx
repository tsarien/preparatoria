import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRetoPorSlug, getProgreso } from "@/lib/retos";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
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
      <header className="flex flex-col gap-1">
        <Link
          href="/dashboard/modulos/ahorro-metas"
          className="text-sm text-ink-soft underline underline-offset-2"
        >
          ← Ahorro con metas
        </Link>
        <h1 className="font-display text-2xl font-semibold text-ink">
          {meta ? meta.nombre : "Crea tu meta de ahorro"}
        </h1>
      </header>

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
