import { GameModuleShell } from "@/components/game/game-module-shell";
import { ConsultaIAEducativa } from "@/components/educador/consulta-ia-educativa";
import { obtenerEstudiantesEducador } from "@/lib/educacion";
import { requireEducador } from "@/lib/educacion-server";

export default async function IAEducativaPage() {
  const { supabase } = await requireEducador();
  const { estudiantes, error } = await obtenerEstudiantesEducador(supabase);

  return (
    <GameModuleShell ancho="estandar">
      <header>
        <p className="text-xs font-bold uppercase text-turquoise">
          Asistente pedagógico
        </p>
        <h1 className="font-display text-3xl font-bold text-ink">
          IA educativa
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Consulta estrategias basadas únicamente en el progreso disponible de
          tu colegio.
        </p>
      </header>
      {error ? (
        <p
          className="rounded-xl border border-alert/30 bg-alert-soft p-4 text-sm text-ink"
          role="alert"
        >
          No se pudieron cargar los datos educativos.
        </p>
      ) : estudiantes.length === 0 ? (
        <p className="rounded-xl border border-line bg-paper-raised p-4 text-sm text-ink-soft">
          Aún no hay datos de progreso para consultar.
        </p>
      ) : (
        <ConsultaIAEducativa estudiantes={estudiantes} />
      )}
    </GameModuleShell>
  );
}
