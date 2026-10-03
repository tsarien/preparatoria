import Link from "next/link";
import { Plus } from "lucide-react";
import { GameModuleShell } from "@/components/game/game-module-shell";
import { Campo, CLASE_CAMPO, EncabezadoAdmin, Insignia, VacioAdmin } from "@/components/admin/ui";
import { FormularioAdmin } from "@/components/admin/formulario-admin";
import { obtenerClienteServicio, requireAdmin } from "@/lib/admin-server";
import { crearColegio } from "../actions";

export default async function ColegiosPage() {
  await requireAdmin();
  const servicio = obtenerClienteServicio();

  const [{ data: colegios }, { data: perfiles }, { data: cursos }] = await Promise.all([
    servicio
      .from("colegios")
      .select("id, nombre, ciudad, codigo_institucional, activo")
      .order("nombre"),
    servicio.from("perfiles").select("colegio_id, rol").not("colegio_id", "is", null).limit(20000),
    servicio.from("cursos_colegio").select("colegio_id").eq("activo", true).limit(20000),
  ]);

  const conteo = new Map<string, { estudiantes: number; educadores: number; cursos: number }>();
  const celda = (id: string) => {
    if (!conteo.has(id)) conteo.set(id, { estudiantes: 0, educadores: 0, cursos: 0 });
    return conteo.get(id)!;
  };
  for (const p of perfiles ?? []) {
    if (p.rol === "estudiante") celda(String(p.colegio_id)).estudiantes++;
    if (p.rol === "educador") celda(String(p.colegio_id)).educadores++;
  }
  for (const c of cursos ?? []) celda(String(c.colegio_id)).cursos++;

  return (
    <GameModuleShell ancho="amplio">
      <EncabezadoAdmin
        etiqueta="Instituciones"
        titulo="Colegios"
        descripcion="Registra colegios, configura sus cursos y genera invitaciones para sus educadores."
      />

      <details className="game-card rounded-2xl bg-paper-raised p-4 open:pb-5">
        <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 font-display text-base font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden">
          <Plus className="h-4 w-4 text-primary" aria-hidden="true" />
          Nuevo colegio
        </summary>
        <FormularioAdmin accion={crearColegio} etiquetaEnvio="Crear colegio" className="mt-4">
          <Campo etiqueta="Nombre del colegio">
            <input name="nombre" required minLength={3} maxLength={120} className={CLASE_CAMPO} />
          </Campo>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo etiqueta="Ciudad">
              <input name="ciudad" maxLength={80} className={CLASE_CAMPO} />
            </Campo>
            <Campo etiqueta="Código institucional" ayuda="Opcional. Letras, números, punto y guion.">
              <input name="codigo" maxLength={40} className={CLASE_CAMPO} />
            </Campo>
          </div>
        </FormularioAdmin>
      </details>

      {(colegios ?? []).length === 0 ? (
        <VacioAdmin>Aún no hay colegios registrados. Crea el primero arriba.</VacioAdmin>
      ) : (
        <div className="game-card overflow-x-auto rounded-2xl bg-paper-raised">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b-2 border-line text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th scope="col" className="px-4 py-3">Colegio</th>
                <th scope="col" className="px-4 py-3">Ciudad</th>
                <th scope="col" className="px-4 py-3 text-right">Cursos</th>
                <th scope="col" className="px-4 py-3 text-right">Estudiantes</th>
                <th scope="col" className="px-4 py-3 text-right">Educadores</th>
                <th scope="col" className="px-4 py-3">Estado</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(colegios ?? []).map((c) => {
                const n = conteo.get(c.id) ?? { estudiantes: 0, educadores: 0, cursos: 0 };
                return (
                  <tr key={c.id}>
                    <td className="px-4 py-3">
                      <p className="break-words font-semibold text-ink">{c.nombre}</p>
                      {c.codigo_institucional && (
                        <p className="font-mono text-xs text-ink-soft">{c.codigo_institucional}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{c.ciudad ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-mono">{n.cursos}</td>
                    <td className="px-4 py-3 text-right font-mono">{n.estudiantes}</td>
                    <td className="px-4 py-3 text-right font-mono">{n.educadores}</td>
                    <td className="px-4 py-3">
                      <Insignia valor={c.activo ? "activo" : "inactivo"} etiqueta={c.activo ? "Activo" : "Inactivo"} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/admin/colegios/${c.id}`}
                        className="font-semibold text-primary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        Gestionar
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </GameModuleShell>
  );
}
