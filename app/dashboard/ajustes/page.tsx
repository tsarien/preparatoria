import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { EncabezadoPagina } from "@/components/encabezado-pagina";
import { TemaSelector } from "./tema-selector";

export default async function AjustesPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-6 py-12">
      <EncabezadoPagina
        volverHref="/dashboard"
        volverEtiqueta="Volver al dashboard"
        titulo="Ajustes"
        icono="/mascota/mascota-neutral.png"
      />

      <Card>
        <CardHeader>
          <CardTitle>Apariencia</CardTitle>
          <CardDescription>Elige cómo se ve preparatorIA en este dispositivo.</CardDescription>
        </CardHeader>
        <CardContent>
          <TemaSelector />
        </CardContent>
      </Card>
    </main>
  );
}
