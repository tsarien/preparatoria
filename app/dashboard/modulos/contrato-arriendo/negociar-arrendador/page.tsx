import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRetoPorSlug, getProgreso } from "@/lib/retos";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { NegociacionArrendador } from "./negociacion-arrendador";
import type { TutorFeedback } from "@/lib/ai/schemas/tutor";

export default async function NegociarArrendadorPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: reto } = await getRetoPorSlug(supabase, "negociar-arrendador");
  const progreso = reto ? (await getProgreso(supabase, user.id, reto.id)).data : null;
  const config = reto?.config as { mensaje_inicial?: string; punto_negociacion?: string } | null;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-6 py-12">
      <header className="flex flex-col gap-1">
        <Link
          href="/dashboard/modulos/contrato-arriendo"
          className="text-sm text-ink-soft underline underline-offset-2"
        >
          ← Contrato de arriendo
        </Link>
        <h1 className="font-display text-2xl font-semibold text-ink">Negocia con el arrendador</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Tu misión</CardTitle>
          <CardDescription>{config?.punto_negociacion}</CardDescription>
        </CardHeader>
        <CardContent>
          <NegociacionArrendador
            mensajeInicial={config?.mensaje_inicial ?? ""}
            feedbackPrevio={progreso?.estado === "completado" ? (progreso.feedback_ia as TutorFeedback) : null}
          />
        </CardContent>
      </Card>
    </main>
  );
}
