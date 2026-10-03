"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, GraduationCap, School } from "lucide-react";
import { listarCursosColegio } from "@/app/actions/cursos";

interface ColegioOpcion {
  id: string;
  nombre: string;
}

interface Props {
  colegios: ColegioOpcion[];
  /** estudiante: un curso (select); educador: varios cursos (desplegable con casillas). */
  modo: "estudiante" | "educador";
  colegioInicial?: string;
  cursoInicial?: string;
  /** Solo educador: cursos ya seleccionados (edición de una cuenta existente). */
  cursosIniciales?: string[];
  idPrefijo?: string;
}

const ESTILO_SELECT =
  "h-11 w-full appearance-none rounded-xl border border-line bg-paper-raised pl-10 pr-3 text-sm text-ink outline-none focus-visible:border-primary";

/**
 * Selector de colegio + cursos. La lista de cursos SIEMPRE viene de la base de datos
 * (tabla cursos_colegio, configurada por el administrador) y se vuelve a cargar al cambiar
 * de colegio. El servidor la valida de nuevo al enviar el formulario.
 */
export function ColegioCursoCampos({
  colegios,
  modo,
  colegioInicial = "",
  cursoInicial = "",
  cursosIniciales = [],
  idPrefijo = "reg",
}: Props) {
  const [colegioId, setColegioId] = useState(colegioInicial);
  const [cursos, setCursos] = useState<string[]>([]);
  const [cargando, setCargando] = useState(Boolean(colegioInicial));
  const [seleccion, setSeleccion] = useState<string[]>(cursosIniciales);
  const [cursoEstudiante, setCursoEstudiante] = useState(cursoInicial);
  const peticion = useRef(0);

  useEffect(() => {
    if (!colegioId) return;
    const numero = ++peticion.current;
    listarCursosColegio(colegioId)
      .then((lista) => {
        if (numero !== peticion.current) return; // respuesta vieja: se ignora
        setCursos(lista);
        setSeleccion((previa) => previa.filter((c) => lista.includes(c)));
        setCursoEstudiante((previo) => (lista.includes(previo) ? previo : ""));
      })
      .catch(() => {
        if (numero === peticion.current) setCursos([]);
      })
      .finally(() => {
        if (numero === peticion.current) setCargando(false);
      });
  }, [colegioId]);

  function cambiarColegio(id: string) {
    setCursos([]);
    setSeleccion([]);
    setCursoEstudiante("");
    setCargando(Boolean(id));
    setColegioId(id);
  }

  const sinCursos = Boolean(colegioId) && !cargando && cursos.length === 0;

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefijo}-colegio`} className="text-sm font-medium text-ink">
          {modo === "educador" ? "Colegio / institución" : "Colegio"}
        </label>
        <div className="relative">
          <School
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
            aria-hidden="true"
          />
          <select
            id={`${idPrefijo}-colegio`}
            name="colegio_id"
            required
            value={colegioId}
            onChange={(e) => cambiarColegio(e.target.value)}
            className={ESTILO_SELECT}
          >
            <option value="" disabled>
              Selecciona tu colegio
            </option>
            {colegios.map((colegio) => (
              <option key={colegio.id} value={colegio.id}>
                {colegio.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {modo === "estudiante" ? (
        // Si el colegio no tiene cursos configurados el campo no se muestra y se envía vacío.
        colegioId && (cargando || cursos.length > 0) ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${idPrefijo}-curso`} className="text-sm font-medium text-ink">
              Curso
            </label>
            <div className="relative">
              <GraduationCap
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
                aria-hidden="true"
              />
              <select
                id={`${idPrefijo}-curso`}
                name="curso"
                required
                disabled={cargando}
                value={cursoEstudiante}
                onChange={(e) => setCursoEstudiante(e.target.value)}
                className={ESTILO_SELECT}
              >
                <option value="" disabled>
                  {cargando ? "Cargando cursos…" : "Selecciona tu curso"}
                </option>
                {cursos.map((curso) => (
                  <option key={curso} value={curso}>
                    {curso}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          // Colegio sin cursos configurados: se conserva el curso guardado solo si el colegio no cambió.
          <input
            type="hidden"
            name="curso"
            value={colegioId === colegioInicial ? cursoInicial : ""}
          />
        )
      ) : (
        <div className="flex flex-col gap-1.5">
          <span id={`${idPrefijo}-cursos-etiqueta`} className="text-sm font-medium text-ink">
            Curso(s) que acompaña
          </span>
          <details className="group relative">
            <summary
              aria-labelledby={`${idPrefijo}-cursos-etiqueta`}
              className="flex h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-line bg-paper-raised px-3 text-sm text-ink focus-visible:border-primary [&::-webkit-details-marker]:hidden"
            >
              <GraduationCap className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">
                {!colegioId
                  ? "Primero selecciona el colegio"
                  : cargando
                    ? "Cargando cursos…"
                    : sinCursos
                      ? "Este colegio aún no tiene cursos"
                      : seleccion.length === 0
                        ? "Selecciona uno o varios cursos"
                        : seleccion.join(", ")}
              </span>
              <ChevronDown
                className="h-4 w-4 shrink-0 text-ink-soft transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            {cursos.length > 0 && (
              <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border-2 border-line bg-paper-raised p-1 shadow-xl">
                {cursos.map((curso) => {
                  const marcado = seleccion.includes(curso);
                  return (
                    <li key={curso}>
                      <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm text-ink hover:bg-primary-soft focus-within:bg-primary-soft">
                        <input
                          type="checkbox"
                          name="cursos"
                          value={curso}
                          checked={marcado}
                          onChange={() =>
                            setSeleccion((previa) =>
                              marcado ? previa.filter((c) => c !== curso) : [...previa, curso],
                            )
                          }
                          className="h-4 w-4 accent-primary"
                        />
                        {curso}
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </details>
          {sinCursos && (
            <p className="text-xs text-alert" role="status">
              Pide al administrador de preparatorIA que configure los cursos de tu colegio.
            </p>
          )}
        </div>
      )}
    </>
  );
}
