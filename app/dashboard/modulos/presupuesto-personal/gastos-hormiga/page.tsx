import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRetoPorSlug, getProgreso } from "@/lib/retos";
import { EncabezadoPagina, ICONO_MODULO } from "@/components/encabezado-pagina";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { FeedbackCard } from "@/components/feedback-card";
import { GastosHormigaForm } from "./gastos-hormiga-form";
import type { GastoHormigaItem } from "@/lib/presupuesto";
import type { TutorFeedback } from "@/lib/ai/schemas/tutor";

export default async function GastosHormigaPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: reto } = await getRetoPorSlug(supabase, "gastos-hormiga");
  const progreso = reto ? (await getProgreso(supabase, user.id, reto.id)).data : null;
  const items = (reto?.config as { items?: GastoHormigaItem[] } | null)?.items ?? [];

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-6 py-12">
      <EncabezadoPagina
        volverHref="/dashboard/modulos/presupuesto-personal"
        volverEtiqueta="Presupuesto personal"
        titulo="Detecta los gastos hormiga"
        icono={ICONO_MODULO["presupuesto-personal"]}
        variante="compacta"
      />

      <Card>
        <CardHeader>
          <CardTitle>Tu misión</CardTitle>
          <CardDescription>
            Estos son tus gastos del mes. Marca los que sean &quot;gastos hormiga&quot;: pequeños,
            frecuentes, y fáciles de evitar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {progreso?.estado === "completado" ? (
            <FeedbackCard feedback={progreso.feedback_ia as TutorFeedback} />
          ) : (
            <GastosHormigaForm items={items} />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
