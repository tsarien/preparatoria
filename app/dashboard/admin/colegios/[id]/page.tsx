import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GameModuleShell } from "@/components/game/game-module-shell";
import { Campo, CLASE_CAMPO, EncabezadoAdmin, Insignia, VacioAdmin } from "@/components/admin/ui";
import { AccionAdmin, FormularioAdmin } from "@/components/admin/formulario-admin";
import { obtenerClienteServicio, requireAdmin } from "@/lib/admin-server";
import {
  DIAS_VIGENCIA_INVITACION,
  estadoInvitacion,
  formatearFecha,
} from "@/lib/admin";
import { esUuid } from "@/lib/utils";
import {
  actualizarColegio,
  agregarCursos,
  cambiarEstadoColegio,
  cambiarEstadoCurso,
  eliminarColegio,
  eliminarCurso,
  generarInvitacion,
  regenerarInvitacion,
  revocarInvitacion,
} from "../../actions";

export default async function ColegioDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  if (!esUuid(id)) notFound();
  const servicio = obtenerClienteServicio();

  const { data: colegio } = await servicio
    .from("colegios")
    .select("id, nombre, ciudad, codigo_institucional, activo")
    .eq("id", id)
    .maybeSingle();
  if (!colegio) notFound();

  const [{ data: cursos }, { data: invitaciones }] = await Promise.all([
    servicio.from("cursos_colegio").select("id, nombre, activo").eq("colegio_id", id).order("nombre"),
    servicio
      .from("invitaciones_educador")
      .select("id, correo_institucional, creada_en, expira_en, usada_en, revocada_en")
      .eq("colegio_id", id)
      .order("creada_en", { ascending: false })
      .limit(50),
  ]);

  return (
    <GameModuleShell ancho="amplio">
      <Link
        href="/dashboard/admin/colegios"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-ink-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Colegios
      </Link>
      <EncabezadoAdmin
        etiqueta="Colegio"
        titulo={colegio.nombre}
        acciones={<Insignia valor={colegio.activo ? "activo" : "inactivo"} etiqueta={colegio.activo ? "Activo" : "Inactivo"} />}
      />

      {/* Datos */}
      <section aria-labelledby="datos" className="game-card flex flex-col gap-4 rounded-2xl bg-paper-raised p-4">
        <h2 id="datos" className="font-display text-lg font-semibold text-ink">Datos del colegio</h2>
        <FormularioAdmin accion={actualizarColegio} etiquetaEnvio="Guardar cambios" reiniciar={false}>
          <input type="hidden" name="id" value={colegio.id} />
          <Campo etiqueta="Nombre">
            <input name="nombre" required minLength={3} maxLength={120} defaultValue={colegio.nombre} className={CLASE_CAMPO} />
          </Campo>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo etiqueta="Ciudad">
              <input name="ciudad" maxLength={80} defaultValue={colegio.ciudad ?? ""} className={CLASE_CAMPO} />
            </Campo>
            <Campo etiqueta="Código institucional">
              <input name="codigo" maxLength={40} defaultValue={colegio.codigo_institucional ?? ""} className={CLASE_CAMPO} />
            </Campo>
          </div>
        </FormularioAdmin>
        <div className="flex flex-wrap items-start gap-3 border-t border-line pt-4">
          <AccionAdmin
            accion={cambiarEstadoColegio}
            campos={{ id: colegio.id, activo: String(!colegio.activo) }}
            etiqueta={colegio.activo ? "Desactivar colegio" : "Reactivar colegio"}
            confirmar={colegio.activo ? "¿Desactivar este colegio? Dejará de aparecer en los registros nuevos." : undefined}
          />
          <AccionAdmin
            accion={eliminarColegio}
            campos={{ id: colegio.id }}
            etiqueta="Eliminar colegio"
            peligro
            confirmar="¿Eliminar este colegio definitivamente? Solo es posible si no tiene cuentas, invitaciones ni reportes."
          />
        </div>
      </section>

      {/* Cursos */}
      <section aria-labelledby="cursos" className="game-card flex flex-col gap-4 rounded-2xl bg-paper-raised p-4">
        <div>
          <h2 id="cursos" className="font-display text-lg font-semibold text-ink">Cursos y grupos</h2>
          <p className="text-sm text-ink-soft">
            Estos cursos son los únicos que verán estudiantes y educadores al registrarse.
          </p>
        </div>
        <FormularioAdmin accion={agregarCursos} etiquetaEnvio="Agregar cursos">
          <input type="hidden" name="colegio_id" value={colegio.id} />
          <Campo etiqueta="Cursos nuevos" ayuda="Separa con comas o saltos de línea. Ej.: 10-A, 10-B, 11-A">
            <textarea name="cursos" required rows={2} maxLength={600} className={`${CLASE_CAMPO} h-auto py-2`} />
          </Campo>
        </FormularioAdmin>
        {(cursos ?? []).length === 0 ? (
          <VacioAdmin>Este colegio aún no tiene cursos. Sin cursos, sus educadores no podrán registrarse.</VacioAdmin>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(cursos ?? []).map((curso) => (
              <li key={curso.id} className="flex flex-col gap-2 rounded-xl border-2 border-line bg-paper p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="break-words font-semibold text-ink">{curso.nombre}</span>
                  <Insignia valor={curso.activo ? "activo" : "archivado"} etiqueta={curso.activo ? "Activo" : "Archivado"} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <AccionAdmin
                    accion={cambiarEstadoCurso}
                    campos={{ id: curso.id, activo: String(!curso.activo) }}
                    etiqueta={curso.activo ? "Archivar" : "Reactivar"}
                  />
                  <AccionAdmin
                    accion={eliminarCurso}
                    campos={{ id: curso.id }}
                    etiqueta="Eliminar"
                    peligro
                    confirmar={`¿Quitar el curso ${curso.nombre} de la lista?`}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Invitaciones */}
      <section aria-labelledby="invitaciones" className="game-card flex flex-col gap-4 rounded-2xl bg-paper-raised p-4">
        <div>
          <h2 id="invitaciones" className="font-display text-lg font-semibold text-ink">Invitaciones para educadores</h2>
          <p className="text-sm text-ink-soft">
            Genera un código por correo institucional. El educador lo usa en el registro junto con
            su correo y este colegio.
          </p>
        </div>
        {colegio.activo ? (
          <FormularioAdmin accion={generarInvitacion} etiquetaEnvio="Generar código">
            <input type="hidden" name="colegio_id" value={colegio.id} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
              <Campo etiqueta="Correo institucional del educador">
                <input name="correo" type="email" required maxLength={254} className={CLASE_CAMPO} />
              </Campo>
              <Campo etiqueta="Vigencia">
                <select name="dias" defaultValue="7" className={CLASE_CAMPO}>
                  {DIAS_VIGENCIA_INVITACION.map((d) => (
                    <option key={d} value={d}>{d} días</option>
                  ))}
                </select>
              </Campo>
            </div>
          </FormularioAdmin>
        ) : (
          <VacioAdmin>Reactiva el colegio para generar invitaciones.</VacioAdmin>
        )}

        {(invitaciones ?? []).length === 0 ? (
          <VacioAdmin>Aún no hay invitaciones para este colegio.</VacioAdmin>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="border-b-2 border-line text-xs uppercase tracking-wide text-ink-soft">
                <tr>
                  <th scope="col" className="px-3 py-2">Correo</th>
                  <th scope="col" className="px-3 py-2">Estado</th>
                  <th scope="col" className="px-3 py-2">Creada</th>
                  <th scope="col" className="px-3 py-2">Expira</th>
                  <th scope="col" className="px-3 py-2"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(invitaciones ?? []).map((inv) => {
                  const estado = estadoInvitacion(inv);
                  return (
                    <tr key={inv.id}>
                      <td className="break-all px-3 py-2 text-ink">{inv.correo_institucional}</td>
                      <td className="px-3 py-2">
                        <Insignia valor={estado} etiqueta={{ vigente: "Vigente", usada: "Usada", revocada: "Revocada", vencida: "Vencida" }[estado]} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-ink-soft">{formatearFecha(inv.creada_en)}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-ink-soft">{formatearFecha(inv.expira_en)}</td>
                      <td className="px-3 py-2">
                        {estado !== "usada" && (
                          <div className="flex flex-wrap justify-end gap-2">
                            <AccionAdmin
                              accion={regenerarInvitacion}
                              campos={{ id: inv.id, dias: "7" }}
                              etiqueta="Regenerar"
                              confirmar="Se revocará el código anterior y se generará uno nuevo (7 días)."
                            />
                            {estado === "vigente" && (
                              <AccionAdmin
                                accion={revocarInvitacion}
                                campos={{ id: inv.id }}
                                etiqueta="Revocar"
                                peligro
                                confirmar="¿Revocar esta invitación? El código dejará de funcionar."
                              />
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </GameModuleShell>
  );
}
