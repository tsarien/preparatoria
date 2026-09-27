import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GameModuleShell } from "@/components/game/game-module-shell";
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
    .select("id, saldo_billetera")
    .eq("usuario_id", user.id)
    .single<{ id: string; saldo_billetera: number }>();

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
    <GameModuleShell ancho="compacto">
      <header className="flex flex-col gap-3">
        <Link
          href="/dashboard"
          className="group inline-flex w-fit items-center gap-1.5 text-sm text-ink-soft transition-colors duration-150 hover:text-ink"
        >
          <ArrowLeft
            className="h-4 w-4 transition-transform duration-150 group-hover:-translate-x-0.5 motion-reduce:transition-none"
            aria-hidden="true"
          />
          Volver al dashboard
        </Link>

        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 animate-pop place-items-center rounded-2xl border-2 border-gold/60 bg-gold-soft shadow-[0_3px_0_rgba(255,176,32,0.35)] sm:h-16 sm:w-16">
            <Image
              src="/iconos/eventos/icono-evento-alerta.png"
              alt=""
              width={200}
              height={160}
              className="h-8 w-auto sm:h-9"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="break-words font-display text-2xl font-semibold leading-tight text-ink sm:text-3xl">
              Tus eventos
            </h1>
            <p className="text-sm text-ink-soft">
              Cosas que le pasan a tu personaje mientras no estás mirando.
            </p>
          </div>
        </div>
      </header>

      <EventosLista
        eventosIniciales={eventos ?? []}
        saldoInicial={personaje?.saldo_billetera ?? 0}
      />
    </GameModuleShell>
  );
}
