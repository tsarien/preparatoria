import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  const { data: rankingData } = await supabase.rpc("obtener_ranking_colegio");
  const ranking = rankingData as RankingFila[] | null;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-6 py-12">
      <header className="flex flex-col gap-1">
        <Link href="/dashboard" className="text-sm text-ink-soft underline underline-offset-2">
          ← Volver al dashboard
        </Link>
        <span className="font-mono text-xs uppercase tracking-widest text-ink-soft">Fase 7 · Ranking</span>
        <h1 className="flex items-center gap-2 font-display text-3xl font-semibold text-ink">
          <Image src="/iconos/icono-ranking.png" alt="" width={200} height={169} className="h-8 w-auto" />
          Tu colegio
        </h1>
        <p className="text-ink-soft">Solo se muestra nombre, curso y nivel — nada de datos personales.</p>
      </header>

      <Card>
        <CardContent className="p-0">
          {!ranking || ranking.length === 0 ? (
            <p className="p-4 text-sm text-ink-soft">
              Todavía no hay suficientes estudiantes de tu colegio registrados para armar un ranking.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {ranking.map((fila, i) => {
                const esTu = fila.nombre === perfil?.nombre;
                return (
                  <li
                    key={`${fila.nombre}-${i}`}
                    className={`flex items-center justify-between gap-3 p-4 ${esTu ? "bg-gold-soft" : ""}`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="font-mono text-sm text-ink-soft">{i + 1}</span>
                      <div className="flex min-w-0 flex-col">
                        <span className="break-words text-sm font-medium text-ink">
                          {fila.nombre} {esTu && <span className="text-xs text-ink-soft">(tú)</span>}
                        </span>
                        {fila.curso && <span className="text-xs text-ink-soft">{fila.curso}</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge tone="gold">Nivel {fila.nivel}</Badge>
                      <span className="font-mono text-sm text-ink-soft">{fila.xp.toLocaleString("es-CO")} XP</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
