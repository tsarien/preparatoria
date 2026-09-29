import Link from "next/link";
import { Activity, ArrowRight, BookOpenCheck, Users } from "lucide-react";
import { GameModuleShell } from "@/components/game/game-module-shell";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { obtenerEstudiantesEducador } from "@/lib/educacion";
import { requireEducador } from "@/lib/educacion-server";

export default async function EducadorDashboardPage() {
  const { supabase } = await requireEducador();
  const { estudiantes, error } = await obtenerEstudiantesEducador(supabase);
  const progresoPromedio = estudiantes.length
    ? Math.round(
        estudiantes.reduce(
          (suma, estudiante) => suma + estudiante.progreso_promedio,
          0,
        ) / estudiantes.length,
      )
    : 0;
  const activos = estudiantes.filter((estudiante) =>
    estudiante.actividad_reciente.some(
      (actividad) =>
        Date.now() - new Date(actividad.actualizado_en).getTime() <=
        30 * 24 * 60 * 60 * 1000,
    ),
  ).length;
  const retosCompletados = estudiantes.reduce(
    (suma, estudiante) => suma + estudiante.retos_completados,
    0,
  );
  const modulosCompletados = estudiantes.reduce(
    (suma, estudiante) =>
      suma +
      estudiante.progreso_modulos.filter(
        (modulo) => modulo.total > 0 && modulo.completados === modulo.total,
      ).length,
    0,
  );
  const actividad = estudiantes
    .flatMap((estudiante) =>
      estudiante.actividad_reciente.map((item) => ({
        ...item,
        nombre: estudiante.nombre,
      })),
    )
    .sort((a, b) => Date.parse(b.actualizado_en) - Date.parse(a.actualizado_en))
    .slice(0, 6);

  return (
    <GameModuleShell ancho="estandar">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase text-primary">
            Panel educativo
          </p>
          <h1 className="font-display text-3xl font-bold text-ink">
            Resumen del colegio
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Progreso de estudiantes con consentimiento aprobado.
          </p>
        </div>
        <Link
          href="/dashboard/educador/estudiantes"
          className="inline-flex items-center gap-2 rounded-xl border-2 border-primary/30 bg-paper-raised px-4 py-2 text-sm font-semibold text-ink"
        >
          Ver estudiantes <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </header>

      {error && (
        <p
          className="rounded-xl border border-alert/30 bg-alert-soft p-3 text-sm text-ink"
          role="alert"
        >
          {error} Revisa que las migraciones educativas estén aplicadas.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metrica
          icono={<Users aria-hidden="true" />}
          etiqueta="Estudiantes asociados"
          valor={estudiantes.length}
        />
        <Metrica
          icono={<Activity aria-hidden="true" />}
          etiqueta="Activos, últimos 30 días"
          valor={activos}
        />
        <Metrica
          icono={<BookOpenCheck aria-hidden="true" />}
          etiqueta="Retos realizados"
          valor={retosCompletados}
        />
        <Metrica
          icono={<BookOpenCheck aria-hidden="true" />}
          etiqueta="Módulos completados"
          valor={modulosCompletados}
        />
      </div>

      <Card tone="game" className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-ink">
            Progreso promedio
          </h2>
          <span className="font-mono text-xl font-bold text-primary">
            {progresoPromedio}%
          </span>
        </div>
        <div className="mt-3">
          <ProgressBar
            value={progresoPromedio}
            max={100}
            label={`Progreso promedio del colegio ${progresoPromedio}%`}
          />
        </div>
      </Card>

      <section
        className="flex flex-col gap-3"
        aria-labelledby="actividad-reciente"
      >
        <h2
          id="actividad-reciente"
          className="font-display text-xl font-semibold text-ink"
        >
          Actividad reciente
        </h2>
        {actividad.length === 0 ? (
          <p className="rounded-xl border border-line bg-paper-raised p-4 text-sm text-ink-soft">
            Todavía no hay retos completados para mostrar.
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line bg-paper-raised px-4">
            {actividad.map((item, indice) => (
              <li
                key={`${item.nombre}-${item.reto}-${item.actualizado_en}-${indice}`}
                className="flex flex-wrap justify-between gap-2 py-3 text-sm"
              >
                <span className="text-ink">
                  <strong>{item.nombre}</strong> · {item.reto}
                </span>
                <span className="text-ink-soft">
                  {item.puntaje ?? 0}% ·{" "}
                  {new Date(item.actualizado_en).toLocaleDateString("es-CO")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </GameModuleShell>
  );
}

function Metrica({
  icono,
  etiqueta,
  valor,
}: {
  icono: React.ReactNode;
  etiqueta: string;
  valor: number;
}) {
  return (
    <Card className="flex min-w-0 items-center gap-3 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-primary/30 bg-primary-soft text-primary">
        {icono}
      </span>
      <span className="min-w-0">
        <span className="block font-mono text-2xl font-bold text-ink">
          {valor}
        </span>
        <span className="block text-xs leading-tight text-ink-soft">
          {etiqueta}
        </span>
      </span>
    </Card>
  );
}
