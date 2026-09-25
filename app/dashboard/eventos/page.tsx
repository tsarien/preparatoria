import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EncabezadoPagina } from "@/components/encabezado-pagina";
import { EventosLista } from "./eventos-lista";
import type { EventoAleatorio } from "@/types/database";

export default async function EventosPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: personaje } = await supabase
    .from("personajes")
    .select("id")
    .eq("usuario_id", user.id)
    .single<{ id: string }>();

  const { data: eventos } = personaje
    ? await supabase
        .from("eventos_aleatorios")
        .select("*")
        .eq("personaje_id", personaje.id)
        .eq("estado", "pendiente")
        .order("creado_en", { ascending: false })
        .returns<EventoAleatorio[]>()
    : { data: [] as EventoAleatorio[] };

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-6 py-12">
      <EncabezadoPagina
        volverHref="/dashboard"
        volverEtiqueta="Volver al dashboard"
        titulo="Tus eventos"
        descripcion="Cosas que le pasan a tu personaje mientras no estás mirando."
        icono="/mascota/mascota-neutral.png"
      />

      <EventosLista eventosIniciales={eventos ?? []} />
    </main>
  );
}
