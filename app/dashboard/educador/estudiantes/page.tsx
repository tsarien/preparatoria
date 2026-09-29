import { GameModuleShell } from "@/components/game/game-module-shell";
import { TablaEstudiantes } from "@/components/educador/tabla-estudiantes";
import { obtenerEstudiantesEducador } from "@/lib/educacion";
import { requireEducador } from "@/lib/educacion-server";

export default async function EstudiantesEducadorPage() {
  const { supabase } = await requireEducador();
  const { estudiantes, error } = await obtenerEstudiantesEducador(supabase);

  return (
    <GameModuleShell ancho="estandar">
      <header>
        <p className="text-xs font-bold uppercase text-primary">Seguimiento</p>
        <h1 className="font-display text-3xl font-bold text-ink">
          Estudiantes
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Solo estudiantes del colegio asociado y con consentimiento aprobado.
        </p>
      </header>
      {error ? (
        <p
          className="rounded-xl border border-alert/30 bg-alert-soft p-4 text-sm text-ink"
          role="alert"
        >
          No se pudieron cargar los datos. Verifica las migraciones educativas.
        </p>
      ) : (
        <TablaEstudiantes estudiantes={estudiantes} />
      )}
    </GameModuleShell>
  );
}
