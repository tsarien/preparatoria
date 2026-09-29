"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { filtrarEstudiantes, type EstudianteEducativo } from "@/lib/educacion";

export function TablaEstudiantes({
  estudiantes,
}: {
  estudiantes: EstudianteEducativo[];
}) {
  const [busqueda, setBusqueda] = useState("");
  const [curso, setCurso] = useState("");
  const [modulo, setModulo] = useState("");
  const [estado, setEstado] = useState<
    "todos" | "completado" | "en-progreso" | "pendiente"
  >("todos");
  const cursos = [
    ...new Set(
      estudiantes
        .map((estudiante) => estudiante.curso)
        .filter((valor): valor is string => Boolean(valor)),
    ),
  ];
  const modulos = estudiantes[0]?.progreso_modulos ?? [];
  const filtrados = filtrarEstudiantes(estudiantes, {
    busqueda,
    curso,
    modulo,
    estado,
  });

  return (
    <>
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-line bg-paper-raised p-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs font-semibold text-ink-soft">
          Estudiante
          <span className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              className="h-10 w-full rounded-lg border border-line bg-paper-raised pl-9 pr-3 text-sm text-ink"
            />
          </span>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-ink-soft">
          Curso
          <select
            value={curso}
            onChange={(event) => setCurso(event.target.value)}
            className="h-10 rounded-lg border border-line bg-paper-raised px-3 text-sm text-ink"
          >
            <option value="">Todos los cursos</option>
            {cursos.map((opcion) => (
              <option key={opcion} value={opcion}>
                {opcion}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-ink-soft">
          Módulo
          <select
            value={modulo}
            onChange={(event) => setModulo(event.target.value)}
            className="h-10 rounded-lg border border-line bg-paper-raised px-3 text-sm text-ink"
          >
            <option value="">Todos los módulos</option>
            {modulos.map((opcion) => (
              <option key={opcion.slug} value={opcion.slug}>
                {opcion.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-ink-soft">
          Estado
          <select
            value={estado}
            onChange={(event) => setEstado(event.target.value as typeof estado)}
            className="h-10 rounded-lg border border-line bg-paper-raised px-3 text-sm text-ink"
          >
            <option value="todos">Todos los estados</option>
            <option value="completado">Completado</option>
            <option value="en-progreso">En progreso</option>
            <option value="pendiente">Pendiente</option>
          </select>
        </label>
      </div>

      <p className="text-sm text-ink-soft" aria-live="polite">
        {filtrados.length} estudiantes
      </p>
      {filtrados.length === 0 ? (
        <p className="rounded-xl border border-line bg-paper-raised p-5 text-sm text-ink-soft">
          No hay estudiantes que coincidan con esos filtros.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {filtrados.map((estudiante) => (
            <article
              key={estudiante.estudiante_id}
              className="game-card min-w-0 rounded-2xl bg-paper-raised p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="wrap-break-word font-display text-lg font-semibold text-ink">
                    {estudiante.nombre}
                  </h2>
                  <p className="text-sm text-ink-soft">
                    {estudiante.curso
                      ? `Curso ${estudiante.curso}`
                      : "Curso sin registrar"}{" "}
                    · Nivel {estudiante.nivel} · {estudiante.xp} XP
                  </p>
                </div>
                <Link
                  href={`/dashboard/educador/estudiantes/${estudiante.estudiante_id}`}
                  aria-label={`Ver seguimiento de ${estudiante.nombre}`}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
                </Link>
              </div>
              <div className="mt-3">
                <ProgressBar
                  value={estudiante.progreso_promedio}
                  max={100}
                  label={`Progreso general ${estudiante.progreso_promedio}%`}
                />
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {estudiante.progreso_modulos.map((progreso) => (
                  <ProgressBar
                    key={progreso.slug}
                    value={progreso.completados}
                    max={Math.max(progreso.total, 1)}
                    label={`${progreso.nombre} ${progreso.porcentaje}%`}
                  />
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
