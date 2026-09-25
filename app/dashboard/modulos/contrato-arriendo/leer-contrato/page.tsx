import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRetoPorSlug, getProgreso } from "@/lib/retos";
import { EncabezadoPagina, ICONO_MODULO } from "@/components/encabezado-pagina";
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
      <EncabezadoPagina
        volverHref="/dashboard/modulos/contrato-arriendo"
        volverEtiqueta="Contrato de arriendo"
        titulo="Lee el contrato"
        icono={ICONO_MODULO["contrato-arriendo"]}
        variante="compacta"
      />

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
