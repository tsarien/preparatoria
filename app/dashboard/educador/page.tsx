import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BookOpenCheck,
  FileText,
  Gamepad2,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { GameModuleShell } from "@/components/game/game-module-shell";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { cn } from "@/lib/utils";
import { obtenerEstudiantesEducador } from "@/lib/educacion";
import { requireEducador } from "@/lib/educacion-server";

export default async function EducadorDashboardPage() {
  const { supabase, nombre } = await requireEducador();
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
  const porModulo = new Map<string, { nombre: string; completados: number; total: number }>();
  for (const estudiante of estudiantes) {
    for (const modulo of estudiante.progreso_modulos) {
      const actual = porModulo.get(modulo.slug) ?? { nombre: modulo.nombre, completados: 0, total: 0 };
      actual.completados += modulo.completados;
      actual.total += modulo.total;
      porModulo.set(modulo.slug, actual);
    }
  }
  const modulos = [...porModulo.values()].filter((m) => m.total > 0);
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
    <GameModuleShell ancho="amplio">
      {/* Banner de bienvenida */}
      <header className="game-card relative overflow-hidden rounded-3xl border-2 border-primary/40 bg-gradient-to-br from-primary-soft via-paper-raised to-gold-soft p-5 sm:p-7">
        <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-12 right-24 h-28 w-28 rounded-full bg-gold/20" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Panel educativo</p>
            <h1 className="mt-1 break-words font-display text-2xl font-bold text-ink sm:text-4xl">
              Hola, {nombre}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-ink-soft sm:text-base">
              Así va el aprendizaje de tus estudiantes en preparatorIA. Solo se incluyen cuentas con
              consentimiento del acudiente aprobado.
            </p>
          </div>
          <Image
            src="/mascota/mascota-celebrando.png"
            alt=""
            width={320}
            height={315}
            className="hidden h-28 w-auto shrink-0 sm:block"
            priority
          />
        </div>
        <nav aria-label="Accesos rápidos" className="relative mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Acceso href="/dashboard/educador/estudiantes" Icono={Users} etiqueta="Estudiantes" />
          <Acceso href="/dashboard/educador/reportes" Icono={FileText} etiqueta="Reportes" />
          <Acceso href="/dashboard/educador/ia" Icono={Sparkles} etiqueta="IA educativa" />
          <Acceso href="/dashboard" Icono={Gamepad2} etiqueta="Explorar el juego" />
        </nav>
      </header>

      {error && (
        <p className="rounded-xl border border-alert/30 bg-alert-soft p-3 text-sm text-ink" role="alert">
          {error} Revisa que las migraciones educativas estén aplicadas.
        </p>
      )}

      <section aria-label="Indicadores" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metrica tono="primary" icono={<Users aria-hidden="true" />} etiqueta="Estudiantes asociados" valor={estudiantes.length} />
        <Metrica tono="turquoise" icono={<Activity aria-hidden="true" />} etiqueta="Activos, últimos 30 días" valor={activos} />
        <Metrica tono="gold" icono={<BookOpenCheck aria-hidden="true" />} etiqueta="Retos realizados" valor={retosCompletados} />
        <Metrica tono="growth" icono={<Trophy aria-hidden="true" />} etiqueta="Módulos completados" valor={modulosCompletados} />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card tone="game" className="flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold text-ink">Progreso promedio</h2>
            <span className="font-mono text-2xl font-bold text-primary">{progresoPromedio}%</span>
          </div>
          <ProgressBar
            value={progresoPromedio}
            max={100}
            label={`Progreso promedio del colegio ${progresoPromedio}%`}
          />
          {modulos.length > 0 && (
            <ul className="mt-1 flex flex-col gap-3" aria-label="Progreso por módulo">
              {modulos.map((m) => {
                const pct = Math.round((m.completados / m.total) * 100);
                return (
                  <li key={m.nombre} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate font-semibold text-ink">{m.nombre}</span>
                      <span className="shrink-0 font-mono text-ink-soft">{pct}%</span>
                    </div>
                    <ProgressBar value={pct} max={100} label={`${m.nombre}: ${pct}%`} />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <section className="flex flex-col gap-3" aria-labelledby="actividad-reciente">
          <div className="flex items-center justify-between gap-3">
            <h2 id="actividad-reciente" className="font-display text-xl font-semibold text-ink">
              Actividad reciente
            </h2>
            <Link
              href="/dashboard/educador/estudiantes"
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Ver estudiantes <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          {actividad.length === 0 ? (
            <div className="game-card flex flex-col items-center gap-3 rounded-2xl bg-paper-raised p-6 text-center">
              <Image src="/mascota/mascota-pensativo.png" alt="" width={320} height={315} className="h-20 w-auto" />
              <p className="max-w-xs text-sm text-ink-soft">
                Todavía no hay retos completados. Cuando tus estudiantes avancen, verás aquí su actividad.
              </p>
            </div>
          ) : (
            <ul className="game-card divide-y divide-line rounded-2xl bg-paper-raised px-4">
              {actividad.map((item, indice) => (
                <li
                  key={`${item.nombre}-${item.reto}-${item.actualizado_en}-${indice}`}
                  className="flex items-center gap-3 py-3 text-sm"
                >
                  <span
                    aria-hidden="true"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-primary/30 bg-primary-soft font-display text-sm font-bold text-primary"
                  >
                    {item.nombre.trim().charAt(0).toUpperCase() || "?"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-ink">
                      <strong>{item.nombre}</strong> · {item.reto}
                    </span>
                    <span className="block text-xs text-ink-soft">
                      {new Date(item.actualizado_en).toLocaleDateString("es-CO")}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full border border-growth/40 bg-growth-soft px-2 py-0.5 font-mono text-xs font-semibold text-ink">
                    {item.puntaje ?? 0}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </GameModuleShell>
  );
}

function Acceso({
  href,
  Icono,
  etiqueta,
}: {
  href: string;
  Icono: React.ComponentType<{ className?: string }>;
  etiqueta: string;
}) {
  return (
    <Link
      href={href}
      className="game-chip press flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-primary/30 bg-paper-raised px-3 text-center text-sm font-semibold text-ink transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
    >
      <Icono className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <span>{etiqueta}</span>
    </Link>
  );
}

const TONOS = {
  primary: "border-primary/40 bg-primary-soft text-primary",
  turquoise: "border-turquoise/50 bg-turquoise-soft text-ink",
  gold: "border-gold/50 bg-gold-soft text-ink",
  growth: "border-growth/50 bg-growth-soft text-ink",
} as const;

function Metrica({
  icono,
  etiqueta,
  valor,
  tono,
}: {
  icono: React.ReactNode;
  etiqueta: string;
  valor: number;
  tono: keyof typeof TONOS;
}) {
  return (
    <Card className="flex min-w-0 items-center gap-3 p-4">
      <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2", TONOS[tono])}>
        {icono}
      </span>
      <span className="min-w-0">
        <span className="block font-mono text-2xl font-bold text-ink">{valor}</span>
        <span className="block text-xs leading-tight text-ink-soft">{etiqueta}</span>
      </span>
    </Card>
  );
}
