import Link from "next/link";
import { GameModuleShell } from "@/components/game/game-module-shell";
import { CLASE_CAMPO, EncabezadoAdmin, Insignia, Paginacion, VacioAdmin } from "@/components/admin/ui";
import { obtenerClienteServicio, requireAdmin } from "@/lib/admin-server";
import { POR_PAGINA, formatearFechaHora, limpiarBusqueda, paginaSegura } from "@/lib/admin";
import {
  CATEGORIAS_TICKET,
  ESTADOS_TICKET,
  PRIORIDADES_TICKET,
  esCategoriaTicket,
  esEstadoTicket,
  esPrioridadTicket,
  etiquetaCategoria,
  etiquetaEstado,
  etiquetaPrioridad,
} from "@/lib/soporte";
import type { CategoriaTicket, EstadoTicket, PrioridadTicket } from "@/types/database";

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; prioridad?: string; categoria?: string; pagina?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const q = limpiarBusqueda(sp.q);
  const estado: EstadoTicket | "" = esEstadoTicket(sp.estado ?? "") ? (sp.estado as EstadoTicket) : "";
  const prioridad: PrioridadTicket | "" = esPrioridadTicket(sp.prioridad ?? "") ? (sp.prioridad as PrioridadTicket) : "";
  const categoria: CategoriaTicket | "" = esCategoriaTicket(sp.categoria ?? "") ? (sp.categoria as CategoriaTicket) : "";
  const pagina = paginaSegura(sp.pagina);
  const servicio = obtenerClienteServicio();

  // Conteo por estado (tarjetas de resumen) + listado filtrado.
  const contar = (e: EstadoTicket) =>
    servicio.from("tickets_soporte").select("id", { count: "exact", head: true }).eq("estado", e);
  let consulta = servicio
    .from("tickets_soporte")
    .select("id, usuario_id, asunto, categoria, estado, prioridad, creado_en, actualizado_en", { count: "exact" });
  if (q) consulta = consulta.ilike("asunto", `%${q}%`);
  if (estado) consulta = consulta.eq("estado", estado);
  if (prioridad) consulta = consulta.eq("prioridad", prioridad);
  if (categoria) consulta = consulta.eq("categoria", categoria);
  const desde = (pagina - 1) * POR_PAGINA;

  const [abiertos, enProceso, respondidos, cerrados, { data: tickets, count }] = await Promise.all([
    contar("abierto"),
    contar("en_proceso"),
    contar("respondido"),
    contar("cerrado"),
    consulta.order("actualizado_en", { ascending: false }).range(desde, desde + POR_PAGINA - 1),
  ]);

  const usuarios = [...new Set((tickets ?? []).map((t) => t.usuario_id))];
  const { data: perfiles } = usuarios.length
    ? await servicio.from("perfiles").select("id, nombre, rol").in("id", usuarios)
    : { data: [] as { id: string; nombre: string; rol: string }[] };
  const autor = new Map((perfiles ?? []).map((p) => [p.id, p]));
  const query = new URLSearchParams(Object.entries({ q, estado, prioridad, categoria }).filter(([, v]) => v));

  const resumen = [
    { clave: "abierto", etiqueta: "Abiertos", n: abiertos.count ?? 0 },
    { clave: "en_proceso", etiqueta: "En proceso", n: enProceso.count ?? 0 },
    { clave: "respondido", etiqueta: "Respondidos", n: respondidos.count ?? 0 },
    { clave: "cerrado", etiqueta: "Cerrados", n: cerrados.count ?? 0 },
  ];

  return (
    <GameModuleShell ancho="amplio">
      <EncabezadoAdmin
        etiqueta="Soporte"
        titulo="Tickets"
        descripcion="Solicitudes de ayuda de estudiantes y educadores."
      />

      <section aria-label="Tickets por estado" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {resumen.map((r) => (
          <Link
            key={r.clave}
            href={`/dashboard/admin/tickets?estado=${r.clave}`}
            className="game-card flex items-center justify-between gap-2 rounded-2xl bg-paper-raised p-3 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transform-none"
          >
            <Insignia valor={r.clave} etiqueta={r.etiqueta} />
            <span className="font-mono text-2xl font-bold text-ink">{r.n}</span>
          </Link>
        ))}
      </section>

      <form
        method="get"
        role="search"
        className="game-card grid grid-cols-1 gap-3 rounded-2xl bg-paper-raised p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_auto]"
      >
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Buscar en el asunto
          <input name="q" defaultValue={q} maxLength={60} className={CLASE_CAMPO} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Estado
          <select name="estado" defaultValue={estado} className={CLASE_CAMPO}>
            <option value="">Todos</option>
            {ESTADOS_TICKET.map((e) => <option key={e.valor} value={e.valor}>{e.etiqueta}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Prioridad
          <select name="prioridad" defaultValue={prioridad} className={CLASE_CAMPO}>
            <option value="">Todas</option>
            {PRIORIDADES_TICKET.map((p) => <option key={p.valor} value={p.valor}>{p.etiqueta}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Categoría
          <select name="categoria" defaultValue={categoria} className={CLASE_CAMPO}>
            <option value="">Todas</option>
            {CATEGORIAS_TICKET.map((c) => <option key={c.valor} value={c.valor}>{c.etiqueta}</option>)}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button type="submit" className="press h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
            Filtrar
          </button>
          {(q || estado || prioridad || categoria) && (
            <Link href="/dashboard/admin/tickets" className="flex h-11 items-center px-2 text-sm font-semibold text-ink-soft underline underline-offset-2">
              Limpiar
            </Link>
          )}
        </div>
      </form>

      {(tickets ?? []).length === 0 ? (
        <VacioAdmin>No hay tickets con esos filtros.</VacioAdmin>
      ) : (
        <div className="game-card overflow-x-auto rounded-2xl bg-paper-raised">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="border-b-2 border-line text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th scope="col" className="px-4 py-3">Asunto</th>
                <th scope="col" className="px-4 py-3">Usuario</th>
                <th scope="col" className="px-4 py-3">Categoría</th>
                <th scope="col" className="px-4 py-3">Prioridad</th>
                <th scope="col" className="px-4 py-3">Estado</th>
                <th scope="col" className="px-4 py-3">Actualizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line align-top">
              {(tickets ?? []).map((t) => {
                const persona = autor.get(t.usuario_id);
                return (
                  <tr key={t.id}>
                    <td className="max-w-xs px-4 py-3">
                      <Link
                        href={`/dashboard/admin/tickets/${t.id}`}
                        className="break-words font-semibold text-primary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {t.asunto}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {persona?.nombre ?? "—"}
                      {persona && <span className="block text-xs capitalize">{persona.rol}</span>}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{etiquetaCategoria(t.categoria)}</td>
                    <td className="px-4 py-3"><Insignia valor={t.prioridad} etiqueta={etiquetaPrioridad(t.prioridad)} /></td>
                    <td className="px-4 py-3"><Insignia valor={t.estado} etiqueta={etiquetaEstado(t.estado)} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{formatearFechaHora(t.actualizado_en)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Paginacion
        pagina={pagina}
        total={count ?? 0}
        porPagina={POR_PAGINA}
        hrefPara={(p) => {
          const qs = new URLSearchParams(query);
          qs.set("pagina", String(p));
          return `/dashboard/admin/tickets?${qs}`;
        }}
      />
    </GameModuleShell>
  );
}
