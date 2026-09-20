import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRetoPorSlug, getProgreso } from "@/lib/retos";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-6 py-12">
      <header className="flex flex-col gap-1">
        <Link
          href="/dashboard/modulos/detectar-estafas"
          className="text-sm text-ink-soft underline underline-offset-2"
        >
          ← Detectar estafas
        </Link>
        <h1 className="font-display text-2xl font-semibold text-ink">{reto.nombre}</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>¿Estafa o no?</CardTitle>
        </CardHeader>
        <CardContent>
          <EscenarioEstafa
            retoSlug={retoSlug}
            canal={config.canal}
            remitente={config.remitente}
            mensajeInicial={config.mensaje_inicial}
            interactivo={config.interactivo}
            feedbackPrevio={progreso?.estado === "completado" ? (progreso.feedback_ia as TutorFeedback) : null}
          />
        </CardContent>
      </Card>
    </main>
  );
}
