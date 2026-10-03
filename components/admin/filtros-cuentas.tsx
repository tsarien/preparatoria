import Link from "next/link";
import { CLASE_CAMPO } from "@/components/admin/ui";

/** Filtros por GET (sin JavaScript): búsqueda por nombre, colegio, curso y estado. */
export function FiltrosCuentas({
  ruta,
  colegios,
  cursos,
  valores,
}: {
  ruta: string;
  colegios: { id: string; nombre: string }[];
  cursos: string[];
  valores: { q: string; colegio: string; curso: string; estado: string };
}) {
  const hayFiltros = Object.values(valores).some(Boolean);
  return (
    <form
      method="get"
      action={ruta}
      role="search"
      className="game-card grid grid-cols-1 gap-3 rounded-2xl bg-paper-raised p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_auto]"
    >
      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
        Buscar por nombre
        <input name="q" defaultValue={valores.q} maxLength={60} className={CLASE_CAMPO} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
        Colegio
        <select name="colegio" defaultValue={valores.colegio} className={CLASE_CAMPO}>
          <option value="">Todos</option>
          {colegios.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
        Curso
        <input name="curso" list="lista-cursos" defaultValue={valores.curso} maxLength={30} className={CLASE_CAMPO} />
        <datalist id="lista-cursos">
          {cursos.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
        Estado
        <select name="estado" defaultValue={valores.estado} className={CLASE_CAMPO}>
          <option value="">Todos</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>
      </label>
      <div className="flex items-end gap-2">
        <button
          type="submit"
          className="press h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Filtrar
        </button>
        {hayFiltros && (
          <Link href={ruta} className="flex h-11 items-center px-2 text-sm font-semibold text-ink-soft underline underline-offset-2">
            Limpiar
          </Link>
        )}
      </div>
    </form>
  );
}
