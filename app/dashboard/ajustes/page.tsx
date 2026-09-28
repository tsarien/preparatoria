import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, UserRound } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { xpEnNivelActual, XP_POR_NIVEL } from "@/lib/gamification";
import type { Perfil, Personaje } from "@/types/database";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { GameModuleShell } from "@/components/game/game-module-shell";
import { GameBackButton } from "@/components/game/game-back-button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { TemaSelector } from "./tema-selector";

export default async function AjustesPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: perfil }, { data: personaje }] = await Promise.all([
    supabase
      .from("perfiles")
      .select("nombre, curso")
      .eq("id", user.id)
      .single<Pick<Perfil, "nombre" | "curso">>(),
    supabase
      .from("personajes")
      .select("nivel, xp, saldo_billetera")
      .eq("usuario_id", user.id)
      .single<Pick<Personaje, "nivel" | "xp" | "saldo_billetera">>(),
  ]);

  const nombre = perfil?.nombre ?? "Estudiante";
  const xpTotal = personaje?.xp ?? 0;

  return (
    <GameModuleShell ancho="compacto">
      <header className="flex flex-col gap-3">
        <GameBackButton href="/dashboard" label="Volver al mapa" />
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border-2 border-primary/40 bg-primary-soft text-primary shadow-edge-primary sm:h-20 sm:w-20">
            <UserRound className="h-8 w-8 sm:h-9 sm:w-9" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="wrap-break-word font-display text-2xl font-semibold leading-tight text-ink sm:text-3xl">
              Tu perfil
            </h1>
            <p className="text-sm text-ink-soft">Tu cuenta y progreso</p>
          </div>
        </div>
      </header>

      <Card tone="game">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-gold/60 bg-gold-soft font-display text-lg font-bold text-ink">
              {nombre.trim().charAt(0).toUpperCase() || "?"}
            </span>
            <div className="min-w-0">
              <CardTitle className="wrap-break-word">{nombre}</CardTitle>
              <CardDescription className="break-all">
                {user.email ?? "Correo no disponible"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
              {perfil?.curso && <span>Curso {perfil.curso}</span>}
              <span>Nivel {personaje?.nivel ?? 1}</span>
              <span>
                ${(personaje?.saldo_billetera ?? 0).toLocaleString("es-CO")}
              </span>
            </div>
            <Link
              href="/dashboard/billetera"
              className="press game-edge inline-flex h-8 items-center justify-center gap-2 rounded-xl border-primary/30 bg-paper-raised px-3 text-sm font-medium text-ink hover:border-primary/50"
            >
              Billetera <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-4">
            <ProgressBar
              value={xpEnNivelActual(xpTotal)}
              max={XP_POR_NIVEL}
              label={`${xpEnNivelActual(xpTotal)} de ${XP_POR_NIVEL} XP para el siguiente nivel`}
              variant="xp"
            />
          </div>
        </CardContent>
      </Card>

      <Card tone="game">
        <CardHeader>
          <CardTitle>Apariencia</CardTitle>
          <CardDescription>
            Elige cómo se ve preparatorIA en este dispositivo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TemaSelector />
        </CardContent>
      </Card>
    </GameModuleShell>
  );
}
