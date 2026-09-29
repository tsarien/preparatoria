import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GameModuleShell } from "@/components/game/game-module-shell";
import { GameMissionHeader } from "@/components/game/game-mission-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { GameStateBadge } from "@/components/game/game-state-badge";
import type { Modulo } from "@/types/database";

const ICONO_MODULO: Record<string, string> = {
  "presupuesto-personal": "/iconos/icono-presupuesto.png",
  "primer-empleo": "/iconos/icono-empleo.png",
  "detectar-estafas": "/iconos/icono-seguridad.png",
  "contrato-arriendo": "/iconos/icono-contrato.png",
  "ahorro-metas": "/iconos/icono-ahorro.png",
};

const GRUPOS_ETIQUETA: Record<string, string> = {
  dinero: "Dinero",
  seguridad_digital: "Seguridad digital",
  vida_independiente: "Vida independiente",
  vida_profesional: "Vida profesional",
};

type ModuloResumen = Pick<
  Modulo,
  "id" | "slug" | "grupo" | "nombre" | "descripcion"
>;

export default async function ModulosPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: modulos } = await supabase
    .from("modulos")
    .select("id, slug, grupo, nombre, descripcion")
    .eq("estado", "mvp")
    .order("orden")
    .returns<ModuloResumen[]>();

  const { data: retos } = await supabase
    .from("retos")
    .select("id, modulo_id")
    .returns<{ id: string; modulo_id: string }[]>();

  const { data: progresos } = await supabase
    .from("progreso_usuario_reto")
    .select("reto_id, estado")
    .eq("usuario_id", user.id)
    .returns<{ reto_id: string; estado: string }[]>();

  const completados = new Set(
    (progresos ?? [])
      .filter((p) => p.estado === "completado")
      .map((p) => p.reto_id),
  );

  const modulosConProgreso = (modulos ?? []).map((m) => {
    const retosDelModulo = (retos ?? []).filter((r) => r.modulo_id === m.id);
    const hechos = retosDelModulo.filter((r) => completados.has(r.id)).length;
    return { ...m, total: retosDelModulo.length, hechos };
  });

  const totalGlobal = modulosConProgreso.reduce((s, m) => s + m.total, 0);
  const hechosGlobal = modulosConProgreso.reduce((s, m) => s + m.hechos, 0);

  return (
    <GameModuleShell>
      <GameMissionHeader
        volverHref="/dashboard"
        volverEtiqueta="Volver al mapa"
        categoria="Tus misiones"
        mision={
          totalGlobal > 0
            ? `${hechosGlobal} de ${totalGlobal} completadas`
            : undefined
        }
        titulo="Retos disponibles"
        tagline="Explora los módulos y empieza por donde más te llame."
        progreso={
          totalGlobal > 0
            ? { completados: hechosGlobal, total: totalGlobal }
            : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {modulosConProgreso.map((m) => {
          const icono = ICONO_MODULO[m.slug];
          const completo = m.total > 0 && m.hechos === m.total;
          const enProgreso = m.hechos > 0 && !completo;
          return (
            <Link
              key={m.slug}
              href={`/dashboard/modulos/${m.slug}`}
              className="group"
            >
              <article className="game-card flex h-full flex-col gap-3 rounded-2xl bg-paper-raised p-4 transition-transform duration-200 motion-reduce:transition-none group-hover:-translate-y-0.5">
                <div className="flex items-center gap-3">
                  {icono && (
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border-2 border-primary/40 bg-primary-soft">
                      <Image
                        src={icono}
                        alt=""
                        width={200}
                        height={160}
                        className="h-8 w-auto"
                      />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                      {GRUPOS_ETIQUETA[m.grupo] ?? m.grupo}
                    </span>
                    <h3 className="break-words font-display text-base font-semibold leading-tight text-ink">
                      {m.nombre}
                    </h3>
                  </div>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-ink-soft transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </div>
                {m.descripcion && (
                  <p className="text-xs leading-relaxed text-ink-soft">
                    {m.descripcion}
                  </p>
                )}
                <div className="mt-auto flex flex-col gap-2">
                  <ProgressBar
                    value={m.hechos}
                    max={m.total}
                    label={`${m.hechos} de ${m.total}`}
                  />
                  <GameStateBadge
                    estado={
                      completo
                        ? "completado"
                        : enProgreso
                          ? "en-progreso"
                          : "pendiente"
                    }
                  />
                </div>
              </article>
            </Link>
          );
        })}
      </div>
    </GameModuleShell>
  );
}
