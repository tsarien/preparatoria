import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRetoPorSlug, getProgreso } from "@/lib/retos";
import { EncabezadoPagina, ICONO_MODULO } from "@/components/encabezado-pagina";
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
      <EncabezadoPagina
        volverHref="/dashboard/modulos/contrato-arriendo"
        volverEtiqueta="Contrato de arriendo"
        titulo="Negocia con el arrendador"
        icono={ICONO_MODULO["contrato-arriendo"]}
        variante="compacta"
      />

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
