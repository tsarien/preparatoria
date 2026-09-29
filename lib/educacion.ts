import type { SupabaseClient } from "@supabase/supabase-js";

export interface ProgresoModuloEducativo {
  slug: string;
  nombre: string;
  total: number;
  completados: number;
  porcentaje: number;
}

export interface ActividadEducativa {
  reto: string;
  puntaje: number | null;
  actualizado_en: string;
}

export interface EstudianteEducativo {
  estudiante_id: string;
  nombre: string;
  curso: string | null;
  nivel: number;
  xp: number;
  retos_completados: number;
  total_retos: number;
  progreso_promedio: number;
  progreso_modulos: ProgresoModuloEducativo[];
  actividad_reciente: ActividadEducativa[];
}

export interface FiltrosEstudiantes {
  busqueda: string;
  curso: string;
  modulo: string;
  estado: "todos" | "completado" | "en-progreso" | "pendiente";
}

export interface ResumenEducativoMinimizado {
  curso: string | null;
  progreso_promedio: number;
  retos_completados: number;
  total_retos: number;
  progreso_modulos: {
    nombre: string;
    completados: number;
    total: number;
    porcentaje: number;
  }[];
}

export function resumirDatosEducativos(
  estudiantes: EstudianteEducativo[],
  curso: string | null,
): ResumenEducativoMinimizado {
  const modulos = new Map<
    string,
    { nombre: string; completados: number; total: number }
  >();
  for (const estudiante of estudiantes) {
    for (const modulo of estudiante.progreso_modulos) {
      const actual = modulos.get(modulo.slug) ?? {
        nombre: modulo.nombre,
        completados: 0,
        total: 0,
      };
      actual.completados += modulo.completados;
      actual.total += modulo.total;
      modulos.set(modulo.slug, actual);
    }
  }

  const totalRetos = estudiantes.reduce(
    (suma, estudiante) => suma + estudiante.total_retos,
    0,
  );
  const retosCompletados = estudiantes.reduce(
    (suma, estudiante) => suma + estudiante.retos_completados,
    0,
  );
  return {
    curso,
    progreso_promedio: estudiantes.length
      ? Math.round(
          estudiantes.reduce(
            (suma, estudiante) => suma + estudiante.progreso_promedio,
            0,
          ) / estudiantes.length,
        )
      : 0,
    retos_completados: retosCompletados,
    total_retos: totalRetos,
    progreso_modulos: [...modulos.values()].map((modulo) => ({
      ...modulo,
      porcentaje: modulo.total
        ? Math.round((modulo.completados / modulo.total) * 100)
        : 0,
    })),
  };
}

export function filtrarEstudiantes(
  estudiantes: EstudianteEducativo[],
  filtros: FiltrosEstudiantes,
): EstudianteEducativo[] {
  const busqueda = filtros.busqueda.trim().toLocaleLowerCase("es-CO");

  return estudiantes.filter((estudiante) => {
    if (filtros.curso && estudiante.curso !== filtros.curso) return false;
    const texto =
      `${estudiante.nombre} ${estudiante.curso ?? ""}`.toLocaleLowerCase(
        "es-CO",
      );
    if (busqueda && !texto.includes(busqueda)) return false;

    const modulos = filtros.modulo
      ? estudiante.progreso_modulos.filter(
          (modulo) => modulo.slug === filtros.modulo,
        )
      : estudiante.progreso_modulos;
    if (!filtros.modulo && filtros.estado === "todos") return true;
    return modulos.some((modulo) => {
      if (filtros.estado === "completado") return modulo.porcentaje === 100;
      if (filtros.estado === "en-progreso")
        return modulo.porcentaje > 0 && modulo.porcentaje < 100;
      if (filtros.estado === "pendiente") return modulo.porcentaje === 0;
      return true;
    });
  });
}

export async function obtenerEstudiantesEducador(
  supabase: SupabaseClient,
): Promise<{ estudiantes: EstudianteEducativo[]; error: string | null }> {
  const { data, error } = await supabase.rpc("obtener_estudiantes_educador");

  if (error)
    return { estudiantes: [], error: "No se pudo cargar el grupo educativo." };
  return {
    estudiantes: Array.isArray(data) ? (data as EstudianteEducativo[]) : [],
    error: null,
  };
}
