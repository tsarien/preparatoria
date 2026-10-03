import Link from "next/link";
import { Plus } from "lucide-react";
import { GameModuleShell } from "@/components/game/game-module-shell";
import { Campo, CLASE_CAMPO, EncabezadoAdmin, Insignia, Paginacion, VacioAdmin } from "@/components/admin/ui";
import { AccionAdmin, FormularioAdmin } from "@/components/admin/formulario-admin";
import { FiltrosCuentas } from "@/components/admin/filtros-cuentas";
import { ColegioCursoCampos } from "@/components/auth/colegio-curso-campos";
import { obtenerClienteServicio, requireAdmin } from "@/lib/admin-server";
import { correosPorId, listarColegiosSimple, listarCuentas } from "@/lib/admin-datos";
import { POR_PAGINA, estadoInvitacion, limpiarBusqueda, paginaSegura } from "@/lib/admin";
import { CARGOS_EDUCATIVOS } from "@/lib/educadores";
import { esUuid } from "@/lib/utils";
import { cambiarEstadoCuenta, crearEducador, eliminarCuenta } from "../actions";

export default async function AdminEducadoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; colegio?: string; curso?: string; estado?: string; pagina?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const valores = {
    q: limpiarBusqueda(sp.q),
    colegio: esUuid(sp.colegio ?? "") ? String(sp.colegio) : "",
    curso: limpiarBusqueda(sp.curso).slice(0, 30),
    estado: sp.estado === "activo" || sp.estado === "inactivo" ? sp.estado : "",
  };
  const pagina = paginaSegura(sp.pagina);
  const servicio = obtenerClienteServicio();

  const [colegios, { filas, total }, { data: cursosLista }, { data: invitaciones }] = await Promise.all([
    listarColegiosSimple(servicio),
    listarCuentas(servicio, { rol: "educador", colegioId: valores.colegio, q: valores.q, curso: valores.curso, estado: valores.estado, pagina }),
    valores.colegio
      ? servicio.from("cursos_colegio").select("nombre").eq("colegio_id", valores.colegio).order("nombre")
      : servicio.from("cursos_colegio").select("nombre").order("nombre").limit(300),
    servicio
      .from("invitaciones_educador")
      .select("id, colegio_id, correo_institucional, expira_en, usada_en, revocada_en")
      .is("usada_en", null)
      .is("revocada_en", null)
      .order("creada_en", { ascending: false })
      .limit(100),
  ]);
  const correos = await correosPorId(servicio, filas.map((f) => f.id));
  const nombreColegio = new Map(colegios.map((c) => [c.id, c.nombre]));
  const cursos = [...new Set((cursosLista ?? []).map((c) => String(c.nombre)))];
  const query = new URLSearchParams(Object.entries(valores).filter(([, v]) => v));
  const pendientes = (invitaciones ?? []).filter((i) => estadoInvitacion(i) === "vigente");

  return (
    <GameModuleShell ancho="amplio">
      <EncabezadoAdmin
        etiqueta="Cuentas"
        titulo="Educadores"
        descripcion="Gestiona educadores e invitaciones. Los códigos se generan por colegio."
      />

      {pendientes.length > 0 && (
        <section aria-labelledby="pendientes" className="game-card flex flex-col gap-2 rounded-2xl bg-paper-raised p-4">
          <h2 id="pendientes" className="font-display text-base font-semibold text-ink">
            Invitaciones vigentes sin usar ({pendientes.length})
          </h2>
          <ul className="flex flex-col gap-1 text-sm text-ink-soft">
            {pendientes.slice(0, 8).map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="break-all">{i.correo_institucional} · {nombreColegio.get(i.colegio_id) ?? "Colegio"}</span>
                <Link href={`/dashboard/admin/colegios/${i.colegio_id}`} className="font-semibold text-primary underline underline-offset-2">
                  Gestionar
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-xs text-ink-soft">
            Para generar, regenerar o revocar códigos entra a la ficha del colegio.
          </p>
        </section>
      )}

      <details className="game-card rounded-2xl bg-paper-raised p-4 open:pb-5">
        <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 font-display text-base font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden">
          <Plus className="h-4 w-4 text-primary" aria-hidden="true" />
          Crear cuenta de educador (sin invitación)
        </summary>
        <FormularioAdmin accion={crearEducador} etiquetaEnvio="Crear cuenta" className="mt-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo etiqueta="Nombre completo">
              <input name="nombre" required maxLength={80} className={CLASE_CAMPO} />
            </Campo>
            <Campo etiqueta="Correo institucional">
              <input name="correo" type="email" required maxLength={254} autoComplete="off" className={CLASE_CAMPO} />
            </Campo>
            <Campo etiqueta="Contraseña inicial" ayuda="Mínimo 8 caracteres. Se envía a Supabase Auth; no se guarda en la base de datos.">
              <input name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" className={CLASE_CAMPO} />
            </Campo>
            <Campo etiqueta="Cargo">
              <select name="cargo" required defaultValue="" className={CLASE_CAMPO}>
                <option value="" disabled>Selecciona</option>
                {CARGOS_EDUCATIVOS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Área o asignatura">
              <input name="area" required maxLength={80} className={CLASE_CAMPO} />
            </Campo>
          </div>
          <ColegioCursoCampos colegios={colegios.filter((c) => c.activo)} modo="educador" idPrefijo="adm-edu" />
        </FormularioAdmin>
      </details>

      <FiltrosCuentas ruta="/dashboard/admin/educadores" colegios={colegios} cursos={cursos} valores={valores} />

      {filas.length === 0 ? (
        <VacioAdmin>No se encontraron educadores con esos filtros.</VacioAdmin>
      ) : (
        <div className="game-card overflow-x-auto rounded-2xl bg-paper-raised">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="border-b-2 border-line text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th scope="col" className="px-4 py-3">Educador</th>
                <th scope="col" className="px-4 py-3">Colegio</th>
                <th scope="col" className="px-4 py-3">Cargo y área</th>
                <th scope="col" className="px-4 py-3">Cursos</th>
                <th scope="col" className="px-4 py-3">Estado</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line align-top">
              {filas.map((f) => (
                <tr key={f.id}>
                  <td className="px-4 py-3">
                    <p className="break-words font-semibold text-ink">{f.nombre}</p>
                    <p className="break-all text-xs text-ink-soft">{correos.get(f.id) || "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{(f.colegio_id && nombreColegio.get(f.colegio_id)) || "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {f.cargo_educativo ?? "—"}
                    {f.area_educativa ? <span className="block text-xs">{f.area_educativa}</span> : null}
                  </td>
                  <td className="max-w-[12rem] break-words px-4 py-3 text-ink-soft">{(f.cursos_educativos ?? []).join(", ") || "—"}</td>
                  <td className="px-4 py-3">
                    <Insignia valor={f.activo ? "activo" : "inactivo"} etiqueta={f.activo ? "Activo" : "Inactivo"} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link
                        href={`/dashboard/admin/educadores/${f.id}`}
                        className="min-h-9 rounded-lg border-2 border-line px-3 py-2 text-xs font-semibold text-ink hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        Editar
                      </Link>
                      <AccionAdmin
                        accion={cambiarEstadoCuenta}
                        campos={{ id: f.id, activo: String(!f.activo) }}
                        etiqueta={f.activo ? "Desactivar" : "Reactivar"}
                        confirmar={f.activo ? `¿Desactivar la cuenta de ${f.nombre}? No podrá iniciar sesión.` : undefined}
                      />
                      <AccionAdmin
                        accion={eliminarCuenta}
                        campos={{ id: f.id }}
                        etiqueta="Eliminar"
                        peligro
                        confirmar={`¿Eliminar DEFINITIVAMENTE la cuenta de ${f.nombre}, sus reportes y conversaciones? Esta acción no se puede deshacer.`}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Paginacion
        pagina={pagina}
        total={total}
        porPagina={POR_PAGINA}
        hrefPara={(p) => {
          const qs = new URLSearchParams(query);
          qs.set("pagina", String(p));
          return `/dashboard/admin/educadores?${qs}`;
        }}
      />
    </GameModuleShell>
  );
}
