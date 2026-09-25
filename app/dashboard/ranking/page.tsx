import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EncabezadoPagina } from "@/components/encabezado-pagina";
import { cn } from "@/lib/utils";
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
      <EncabezadoPagina
        volverHref="/dashboard"
        volverEtiqueta="Volver al dashboard"
        titulo="Tu colegio"
        descripcion="Solo se muestra nombre, curso y nivel — nada de datos personales."
        icono="/iconos/icono-ranking.png"
      />

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
                    className={cn("flex animate-fade-up items-center justify-between gap-3 p-4", esTu && "bg-gold-soft")}
                    style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {/* Podio: los tres primeros puestos llevan el acento de marca. */}
                      <span
                        className={cn(
                          "grid h-8 w-8 shrink-0 place-items-center rounded-full font-mono text-sm",
                          i < 3 ? "bg-gold text-[#1f2430] font-semibold" : "bg-primary-soft text-primary"
                        )}
                      >
                        {i + 1}
                      </span>
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
