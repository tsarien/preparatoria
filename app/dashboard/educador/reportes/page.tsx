import { GameModuleShell } from "@/components/game/game-module-shell";
import { FormularioReporte } from "@/components/educador/formulario-reporte";
import { obtenerEstudiantesEducador } from "@/lib/educacion";
import { requireEducador } from "@/lib/educacion-server";
import type { InformeIAEducativa } from "@/lib/ai/schemas/educador";

interface InformeGuardado {
  id: string;
  curso: string | null;
  periodo: string;
  datos_observados: {
    retos_completados: number;
    total_retos: number;
    progreso_promedio: number;
    progreso_modulos: {
      nombre: string;
      completados: number;
      total: number;
      porcentaje: number;
    }[];
  };
  recomendaciones_ia: InformeIAEducativa;
  creado_en: string;
}

export default async function ReportesEducadorPage() {
  const { supabase } = await requireEducador();
  const { estudiantes, error } = await obtenerEstudiantesEducador(supabase);
  const { data: informes } = await supabase
    .from("informes_educativos")
    .select(
      "id, curso, periodo, datos_observados, recomendaciones_ia, creado_en",
    )
    .order("creado_en", { ascending: false })
    .limit(10)
    .returns<InformeGuardado[]>();

  return (
    <GameModuleShell ancho="estandar">
      <header>
        <p className="text-xs font-bold uppercase text-primary">
          Seguimiento pedagógico
        </p>
        <h1 className="font-display text-3xl font-bold text-ink">Reportes</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Los datos observados y las recomendaciones de IA se presentan por
          separado.
        </p>
      </header>
      {error ? (
        <p
          className="rounded-xl border border-alert/30 bg-alert-soft p-4 text-sm text-ink"
          role="alert"
        >
          No se pudieron cargar los estudiantes de tu colegio.
        </p>
      ) : estudiantes.length === 0 ? (
        <p className="rounded-xl border border-line bg-paper-raised p-4 text-sm text-ink-soft">
          Aún no hay datos de estudiantes para elaborar reportes.
        </p>
      ) : (
        <FormularioReporte estudiantes={estudiantes} />
      )}

      {!!informes?.length && (
        <section
          className="flex flex-col gap-3"
          aria-labelledby="reportes-guardados"
        >
          <h2
            id="reportes-guardados"
            className="font-display text-xl font-semibold text-ink"
          >
            Reportes recientes
          </h2>
          {informes.map((informe) => (
            <details
              key={informe.id}
              className="rounded-xl border border-line bg-paper-raised p-4"
            >
              <summary className="cursor-pointer font-semibold text-ink">
                {informe.periodo}{" "}
                {informe.curso ? `· ${informe.curso}` : "· Grupo"} ·{" "}
                {new Date(informe.creado_en).toLocaleDateString("es-CO")}
              </summary>
              <div className="mt-3 flex flex-col gap-3 text-sm">
                <section>
                  <h3 className="font-semibold text-ink">Datos observados</h3>
                  <p className="text-ink-soft">
                    {informe.datos_observados.retos_completados} de{" "}
                    {informe.datos_observados.total_retos} retos · progreso
                    promedio {informe.datos_observados.progreso_promedio}%.
                  </p>
                </section>
                <section className="rounded-lg border border-turquoise/40 bg-turquoise-soft p-3">
                  <h3 className="font-semibold text-ink">
                    Interpretación de IA
                  </h3>
                  <p className="mt-1 text-ink">
                    {informe.recomendaciones_ia.observacion}
                  </p>
                  <ul className="mt-2 list-disc pl-5 text-ink">
                    {informe.recomendaciones_ia.recomendaciones.map(
                      (recomendacion) => (
                        <li key={recomendacion}>{recomendacion}</li>
                      ),
                    )}
                  </ul>
                </section>
              </div>
            </details>
          ))}
        </section>
      )}
    </GameModuleShell>
  );
}
