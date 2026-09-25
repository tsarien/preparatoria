import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRetoPorSlug, getProgreso } from "@/lib/retos";
import { EncabezadoPagina, ICONO_MODULO } from "@/components/encabezado-pagina";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { FeedbackCard } from "@/components/feedback-card";
import { PriorizarGastosForm } from "./priorizar-gastos-form";
import type { PriorizarGastosItem } from "@/lib/presupuesto";
import type { TutorFeedback } from "@/lib/ai/schemas/tutor";

export default async function PriorizarGastosPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: reto } = await getRetoPorSlug(supabase, "priorizar-gastos");
  const progreso = reto ? (await getProgreso(supabase, user.id, reto.id)).data : null;
  const config = reto?.config as { items?: PriorizarGastosItem[]; presupuesto?: number } | null;
  const items = config?.items ?? [];
  const presupuesto = config?.presupuesto ?? 0;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-6 py-12">
      <EncabezadoPagina
        volverHref="/dashboard/modulos/presupuesto-personal"
        volverEtiqueta="Presupuesto personal"
        titulo="Prioriza tus gastos"
        icono={ICONO_MODULO["presupuesto-personal"]}
        variante="compacta"
      />

      <Card>
        <CardHeader>
          <CardTitle>Tu misión</CardTitle>
          <CardDescription>
            Te sobró <span className="font-mono font-medium text-ink">${presupuesto.toLocaleString("es-CO")}</span>{" "}
            este mes, pero quieres más de lo que te alcanza. Elige qué comprar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {progreso?.estado === "completado" ? (
            <FeedbackCard feedback={progreso.feedback_ia as TutorFeedback} />
          ) : (
            <PriorizarGastosForm items={items} presupuesto={presupuesto} />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
