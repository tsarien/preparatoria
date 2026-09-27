import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Users } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GameModuleShell } from "@/components/game/game-module-shell";
import { MyRankCard } from "@/components/game/my-rank-card";
import { RankPlayerRow } from "@/components/game/rank-player-row";
import type { RankingFila } from "@/types/database";

export default async function RankingPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("nombre")
    .eq("id", user.id)
    .single<{ nombre: string }>();

  // Datos del usuario actual — necesarios para que el header no mienta
  // cuando está fuera del top 50 y no aparece en `ranking`.
  const { data: personaje } = await supabase
    .from("personajes")
    .select("nivel, xp")
    .eq("usuario_id", user.id)
    .single<{ nivel: number; xp: number }>();

  const { data: rankingData } = await supabase.rpc("obtener_ranking_colegio");
  const ranking = (rankingData as RankingFila[] | null) ?? [];

  // Identificación del usuario actual por nombre (la RPC no expone usuario_id).
  // Si hay nombres duplicados, se marca el primero.
  const miIndice = ranking.findIndex((f) => f.nombre === perfil?.nombre);
  const miPosicion = miIndice >= 0 ? miIndice + 1 : null;
  const enTop50 = miIndice >= 0;

  // Máximo XP del ranking para escalar las barras de progreso relativas.
  const xpMaximo = ranking.length > 0 ? ranking[0].xp : 0;

  return (
    <GameModuleShell ancho="estandar">
      {/* Header */}
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
          <div className="grid h-16 w-16 shrink-0 animate-pop place-items-center rounded-2xl border-2 border-gold/60 bg-gold-soft shadow-[0_3px_0_rgba(255,176,32,0.35)] sm:h-20 sm:w-20">
            <Image
              src="/iconos/icono-ranking.png"
              alt=""
              width={200}
              height={169}
              className="h-10 w-auto sm:h-12"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="break-words font-display text-2xl font-semibold leading-tight text-ink sm:text-3xl">
              Ranking de tu colegio
            </h1>
            <p className="text-sm text-ink-soft">
              Solo se muestra nombre, curso, nivel y XP — nada más.
            </p>
          </div>
        </div>
      </header>

      {/* Mi posición */}
      <MyRankCard
        posicion={miPosicion}
        nombre={perfil?.nombre ?? "Estudiante"}
        nivel={personaje?.nivel ?? 1}
        xp={personaje?.xp ?? 0}
        enTop50={enTop50}
        totalJugadores={ranking.length}
      />

      {/* Lista de jugadores */}
      <section className="game-card overflow-hidden rounded-2xl bg-paper-raised">
        <div className="flex items-center justify-between gap-3 border-b-2 border-line bg-gradient-to-r from-primary-soft via-paper-raised to-gold-soft px-4 py-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-ink">
              Clasificación
            </h2>
          </div>
          <span className="shrink-0 rounded-full border border-line bg-paper-raised px-2.5 py-0.5 font-mono text-[11px] font-semibold text-ink-soft">
            {ranking.length > 0 ? `Top ${ranking.length}` : "Sin datos"}
          </span>
        </div>

        {ranking.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
            <Image
              src="/mascota/mascota-pensativo.png"
              alt=""
              width={320}
              height={319}
              className="h-16 w-auto"
            />
            <p className="text-sm text-ink-soft">
              Todavía no hay suficientes estudiantes de tu colegio registrados
              para armar un ranking. Invita a tus compañeros.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {ranking.map((fila, i) => (
              <RankPlayerRow
                key={`${fila.nombre}-${i}`}
                posicion={i + 1}
                nombre={fila.nombre}
                curso={fila.curso}
                nivel={fila.nivel}
                xp={fila.xp}
                esUsuarioActual={i === miIndice}
                xpMaximo={xpMaximo}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Nota de alcance — evita malinterpretar el "Top 50" */}
      {ranking.length >= 50 && (
        <p className="text-center text-xs text-ink-soft">
          Se muestran los primeros 50 puestos de tu colegio.
        </p>
      )}
    </GameModuleShell>
  );
}
