import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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
      <header className="flex flex-col gap-1">
        <Link href="/dashboard" className="text-sm text-ink-soft underline underline-offset-2">
          ← Volver al dashboard
        </Link>
        <span className="font-mono text-xs uppercase tracking-widest text-ink-soft">Fase 7 · Vida simulada</span>
        <h1 className="font-display text-3xl font-semibold text-ink">Tus eventos</h1>
        <p className="text-ink-soft">Cosas que le pasan a tu personaje mientras no estás mirando.</p>
      </header>

      <EventosLista eventosIniciales={eventos ?? []} />
    </main>
  );
}
