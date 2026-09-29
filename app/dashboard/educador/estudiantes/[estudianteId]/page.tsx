import { notFound } from "next/navigation";
import Link from "next/link";
import { GameModuleShell } from "@/components/game/game-module-shell";
import { ProgressBar } from "@/components/ui/progress-bar";
import { requireEducador } from "@/lib/educacion-server";
import { obtenerEstudiantesEducador } from "@/lib/educacion";

export default async function DetalleEstudianteEducadorPage({
  params,
}: {
  params: Promise<{ estudianteId: string }>;
}) {
  const { estudianteId } = await params;
  const { supabase } = await requireEducador();
  const { estudiantes, error } = await obtenerEstudiantesEducador(supabase);
  const estudiante = estudiantes.find(
    (item) => item.estudiante_id === estudianteId,
  );
  if (error || !estudiante) notFound();

  return (
    <GameModuleShell ancho="estandar">
      <header className="flex flex-col gap-3">
        <Link
          href="/dashboard/educador/estudiantes"
          className="w-fit text-sm font-semibold text-primary underline underline-offset-2"
        >
          Volver a estudiantes
        </Link>
        <div>
          <p className="text-xs font-bold uppercase text-primary">
            Seguimiento individual
          </p>
          <h1 className="wrap-break-word font-display text-3xl font-bold text-ink">
            {estudiante.nombre}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {estudiante.curso
              ? `Curso ${estudiante.curso}`
              : "Curso sin registrar"}{" "}
            · Nivel {estudiante.nivel} · {estudiante.xp} XP
          </p>
        </div>
      </header>

      <section
        className="rounded-2xl border border-line bg-paper-raised p-4"
        aria-labelledby="progreso-modulos"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            id="progreso-modulos"
            className="font-display text-xl font-semibold text-ink"
          >
            Progreso por módulo
          </h2>
          <span className="text-sm text-ink-soft">
            {estudiante.retos_completados} completados ·{" "}
            {Math.max(estudiante.total_retos - estudiante.retos_completados, 0)}{" "}
            pendientes
          </span>
        </div>
        <div className="mt-4 flex flex-col gap-4">
          {estudiante.progreso_modulos.map((modulo) => (
            <div
              key={modulo.slug}
              className="grid gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,2fr)] sm:items-center sm:gap-4"
            >
              <span className="wrap-break-word text-sm font-medium text-ink">
                {modulo.nombre} · {modulo.completados}/{modulo.total}
              </span>
              <ProgressBar
                value={modulo.completados}
                max={Math.max(modulo.total, 1)}
                label={`${modulo.nombre}: ${modulo.porcentaje}%`}
              />
            </div>
          ))}
        </div>
      </section>

      <section
        className="flex flex-col gap-3"
        aria-labelledby="actividad-estudiante"
      >
        <h2
          id="actividad-estudiante"
          className="font-display text-xl font-semibold text-ink"
        >
          Retos y actividad reciente
        </h2>
        {estudiante.actividad_reciente.length ? (
          <ul className="divide-y divide-line rounded-xl border border-line bg-paper-raised px-4">
            {estudiante.actividad_reciente.map((actividad) => (
              <li
                key={`${actividad.reto}-${actividad.actualizado_en}`}
                className="flex flex-wrap justify-between gap-2 py-3 text-sm"
              >
                <span className="text-ink">{actividad.reto}</span>
                <span className="text-ink-soft">
                  {actividad.puntaje ?? 0}% ·{" "}
                  {new Date(actividad.actualizado_en).toLocaleDateString(
                    "es-CO",
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-line bg-paper-raised p-4 text-sm text-ink-soft">
            Todavía no hay actividad para mostrar.
          </p>
        )}
      </section>
    </GameModuleShell>
  );
}
