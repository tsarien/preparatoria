import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Modulo, Reto, ProgresoUsuarioReto } from "@/types/database";

type RetoResumen = Pick<Reto, "id" | "slug" | "nombre" | "dificultad" | "orden">;
type ProgresoResumen = Pick<ProgresoUsuarioReto, "reto_id" | "estado" | "puntaje">;

export default async function ModuloContratoPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: modulo } = await supabase
    .from("modulos")
    .select("id, nombre, descripcion")
    .eq("slug", "contrato-arriendo")
    .single<Pick<Modulo, "id" | "nombre" | "descripcion">>();

  const { data: retos } = modulo
    ? await supabase
        .from("retos")
        .select("id, slug, nombre, dificultad, orden")
        .eq("modulo_id", modulo.id)
        .order("orden")
        .returns<RetoResumen[]>()
    : { data: [] as RetoResumen[] };

  const { data: progresos } = await supabase
    .from("progreso_usuario_reto")
    .select("reto_id, estado, puntaje")
    .eq("usuario_id", user.id)
    .returns<ProgresoResumen[]>();

  const progresoPorReto = new Map((progresos ?? []).map((p) => [p.reto_id, p]));

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-12">
      <header className="flex flex-col gap-1">
        <Link href="/dashboard" className="text-sm text-ink-soft underline underline-offset-2">
          ← Volver al dashboard
        </Link>
        <span className="font-mono text-xs uppercase tracking-widest text-ink-soft">
          Fase 5 · Vida independiente
        </span>
        <h1 className="font-display text-3xl font-semibold text-ink">
          {modulo?.nombre ?? "Contrato de arriendo"}
        </h1>
        <p className="text-ink-soft">{modulo?.descripcion}</p>
      </header>

      <div className="flex flex-col gap-3">
        {(retos ?? []).map((reto, i) => {
          const progreso = progresoPorReto.get(reto.id);
          const completado = progreso?.estado === "completado";
          return (
            <Link key={reto.id} href={`/dashboard/modulos/contrato-arriendo/${reto.slug}`}>
              <Card className="transition-colors hover:border-ink/30">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="font-mono text-sm text-ink-soft">{i + 1}</span>
                    <div className="flex min-w-0 flex-col">
                      <span className="break-words font-display text-base font-medium text-ink">{reto.nombre}</span>
                      <span className="text-xs text-ink-soft">Dificultad: {reto.dificultad}</span>
                    </div>
                  </div>
                  {completado ? (
                    <Badge tone="growth">Completado · {progreso?.puntaje}/100</Badge>
                  ) : (
                    <Badge tone="ink">Pendiente</Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
