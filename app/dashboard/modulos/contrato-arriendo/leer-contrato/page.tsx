import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRetoPorSlug, getProgreso } from "@/lib/retos";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { FeedbackCard } from "@/components/feedback-card";
import { LeerContratoForm } from "./leer-contrato-form";
import type { Clausula, Pregunta } from "@/lib/contrato";
import type { TutorFeedback } from "@/lib/ai/schemas/tutor";

export default async function LeerContratoPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: reto } = await getRetoPorSlug(supabase, "leer-contrato");
  const progreso = reto ? (await getProgreso(supabase, user.id, reto.id)).data : null;
  const config = reto?.config as { clausulas?: Clausula[]; preguntas?: Pregunta[] } | null;
  const clausulas = config?.clausulas ?? [];
  const preguntas = config?.preguntas ?? [];

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-6 py-12">
      <header className="flex flex-col gap-1">
        <Link
          href="/dashboard/modulos/contrato-arriendo"
          className="text-sm text-ink-soft underline underline-offset-2"
        >
          ← Contrato de arriendo
        </Link>
        <h1 className="font-display text-2xl font-semibold text-ink">Lee el contrato</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Tu misión</CardTitle>
          <CardDescription>
            Este es el contrato que te ofrecen para un apartamento. Léelo con calma antes de responder.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {progreso?.estado === "completado" ? (
            <FeedbackCard feedback={progreso.feedback_ia as TutorFeedback} />
          ) : (
            <LeerContratoForm clausulas={clausulas} preguntas={preguntas} />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
