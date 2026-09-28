import { redirect } from "next/navigation";
import Image from "next/image";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GameModuleShell } from "@/components/game/game-module-shell";
import { GameBackButton } from "@/components/game/game-back-button";
import { ChatGuia } from "./chat-guia";
import { getHistorial, contarMensajesHoy } from "./actions";

export default async function GuiaPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [historial, mensajesHoy] = await Promise.all([
    getHistorial(),
    contarMensajesHoy(),
  ]);

  return (
    <GameModuleShell ancho="estandar">
      <header className="flex flex-col gap-3">
        <GameBackButton href="/dashboard" label="Volver al dashboard" />

        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-primary/50 bg-primary-soft shadow-[0_3px_0_rgba(108,77,255,0.3)] sm:h-20 sm:w-20">
            <Image
              src="/mascota/mascota-neutral.png"
              alt=""
              width={320}
              height={315}
              className="h-12 w-auto animate-pop sm:h-14"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="break-words font-display text-2xl font-semibold leading-tight text-ink sm:text-3xl">
              IA Guía
            </h1>
            <p className="text-sm text-ink-soft">
              Tu compañero para aprender a tomar mejores decisiones.
            </p>
          </div>
        </div>
      </header>

      <ChatGuia historialInicial={historial} mensajesHoy={mensajesHoy} />
    </GameModuleShell>
  );
}
