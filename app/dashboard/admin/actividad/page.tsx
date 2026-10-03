import { GameModuleShell } from "@/components/game/game-module-shell";
import { EncabezadoAdmin, Paginacion, VacioAdmin } from "@/components/admin/ui";
import { obtenerClienteServicio, requireAdmin } from "@/lib/admin-server";
import { ETIQUETAS_ACCION, POR_PAGINA, formatearFechaHora, paginaSegura } from "@/lib/admin";

export default async function ActividadPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  await requireAdmin();
  const pagina = paginaSegura((await searchParams).pagina);
  const servicio = obtenerClienteServicio();
  const desde = (pagina - 1) * POR_PAGINA;
  const { data, count } = await servicio
    .from("actividad_sistema")
    .select("id, actor_id, accion, entidad, entidad_id, detalle, creado_en", { count: "exact" })
    .order("creado_en", { ascending: false })
    .range(desde, desde + POR_PAGINA - 1);

  const actores = [...new Set((data ?? []).map((a) => a.actor_id).filter(Boolean))] as string[];
  const { data: perfiles } = actores.length
    ? await servicio.from("perfiles").select("id, nombre").in("id", actores)
    : { data: [] as { id: string; nombre: string }[] };
  const nombres = new Map((perfiles ?? []).map((p) => [p.id, p.nombre]));

  return (
    <GameModuleShell ancho="amplio">
      <EncabezadoAdmin
        etiqueta="Auditoría"
        titulo="Actividad del sistema"
        descripcion="Registro de acciones administrativas importantes. No guarda contraseñas, códigos ni datos sensibles."
      />
      {(data ?? []).length === 0 ? (
        <VacioAdmin>Todavía no hay actividad registrada.</VacioAdmin>
      ) : (
        <div className="game-card overflow-x-auto rounded-2xl bg-paper-raised">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="border-b-2 border-line text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th scope="col" className="px-4 py-3">Fecha</th>
                <th scope="col" className="px-4 py-3">Acción</th>
                <th scope="col" className="px-4 py-3">Detalle</th>
                <th scope="col" className="px-4 py-3">Realizada por</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(data ?? []).map((a) => (
                <tr key={a.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{formatearFechaHora(a.creado_en)}</td>
                  <td className="px-4 py-3 font-semibold text-ink">{ETIQUETAS_ACCION[a.accion] ?? a.accion}</td>
                  <td className="max-w-xs break-words px-4 py-3 text-ink-soft">{a.detalle ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">{a.actor_id ? (nombres.get(a.actor_id) ?? "Administrador") : "Sistema"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Paginacion
        pagina={pagina}
        total={count ?? 0}
        porPagina={POR_PAGINA}
        hrefPara={(p) => `/dashboard/admin/actividad?pagina=${p}`}
      />
    </GameModuleShell>
  );
}
