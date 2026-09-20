import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRetoPorSlug, getProgreso } from "@/lib/retos";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { FeedbackCard } from "@/components/feedback-card";
import { DistribuirSalarioForm } from "./distribuir-salario-form";
import type { TutorFeedback } from "@/lib/ai/schemas/tutor";

export default async function DistribuirSalarioPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: reto } = await getRetoPorSlug(supabase, "distribuir-salario");
  const { data: personaje } = await supabase
    .from("personajes")
    .select("salario_mensual")
    .eq("usuario_id", user.id)
    .single<{ salario_mensual: number }>();

  const progreso = reto ? (await getProgreso(supabase, user.id, reto.id)).data : null;
  const categorias = (reto?.config as { categorias?: string[] } | null)?.categorias ?? [];

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-6 py-12">
      <header className="flex flex-col gap-1">
        <Link
          href="/dashboard/modulos/presupuesto-personal"
          className="text-sm text-ink-soft underline underline-offset-2"
        >
          ← Presupuesto personal
        </Link>
        <h1 className="font-display text-2xl font-semibold text-ink">Distribuye tu primer salario</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Tu misión</CardTitle>
          <CardDescription>
            Este mes te llegaron{" "}
            <span className="font-mono font-medium text-ink">
              ${(personaje?.salario_mensual ?? 0).toLocaleString("es-CO")}
            </span>
            . Repártelos entre estas categorías — la suma tiene que calzar exacto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {progreso?.estado === "completado" ? (
            <FeedbackCard feedback={progreso.feedback_ia as TutorFeedback} />
          ) : (
            <DistribuirSalarioForm categorias={categorias} salarioMensual={personaje?.salario_mensual ?? 0} />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
