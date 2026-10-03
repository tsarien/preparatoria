import Link from "next/link";
import { Plus } from "lucide-react";
import { Calendar } from "lucide-react";
import { GameModuleShell } from "@/components/game/game-module-shell";
import { Campo, CLASE_CAMPO, EncabezadoAdmin, Insignia, Paginacion, VacioAdmin } from "@/components/admin/ui";
import { AccionAdmin, FormularioAdmin } from "@/components/admin/formulario-admin";
import { FiltrosCuentas } from "@/components/admin/filtros-cuentas";
import { ColegioCursoCampos } from "@/components/auth/colegio-curso-campos";
import { obtenerClienteServicio, requireAdmin } from "@/lib/admin-server";
import { correosPorId, listarColegiosSimple, listarCuentas } from "@/lib/admin-datos";
import { POR_PAGINA, limpiarBusqueda, paginaSegura } from "@/lib/admin";
import { esUuid } from "@/lib/utils";
import { cambiarEstadoCuenta, crearEstudiante, eliminarCuenta } from "../actions";

export default async function AdminEstudiantesPage({
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

  const [colegios, { filas, total }, { data: cursosLista }] = await Promise.all([
    listarColegiosSimple(servicio),
    listarCuentas(servicio, { rol: "estudiante", colegioId: valores.colegio, q: valores.q, curso: valores.curso, estado: valores.estado, pagina }),
    valores.colegio
      ? servicio.from("cursos_colegio").select("nombre").eq("colegio_id", valores.colegio).order("nombre")
      : servicio.from("cursos_colegio").select("nombre").order("nombre").limit(300),
  ]);
  const correos = await correosPorId(servicio, filas.map((f) => f.id));
  const nombreColegio = new Map(colegios.map((c) => [c.id, c.nombre]));
  const cursos = [...new Set((cursosLista ?? []).map((c) => String(c.nombre)))];
  const query = new URLSearchParams(Object.entries(valores).filter(([, v]) => v));

  return (
    <GameModuleShell ancho="amplio">
      <EncabezadoAdmin
        etiqueta="Cuentas"
        titulo="Estudiantes"
        descripcion="Consulta, crea y administra las cuentas de estudiantes. Las contraseñas las gestiona Supabase Auth."
      />

      <details className="game-card rounded-2xl bg-paper-raised p-4 open:pb-5">
        <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 font-display text-base font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden">
          <Plus className="h-4 w-4 text-primary" aria-hidden="true" />
          Crear cuenta de estudiante
        </summary>
        <FormularioAdmin accion={crearEstudiante} etiquetaEnvio="Crear cuenta" className="mt-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo etiqueta="Nombre completo">
              <input name="nombre" required maxLength={80} className={CLASE_CAMPO} />
            </Campo>
            <Campo etiqueta="Correo">
              <input name="correo" type="email" required maxLength={254} autoComplete="off" className={CLASE_CAMPO} />
            </Campo>
            <Campo etiqueta="Contraseña inicial" ayuda="Mínimo 8 caracteres. Se envía a Supabase Auth; no se guarda en la base de datos.">
              <input name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" className={CLASE_CAMPO} />
            </Campo>
            <Campo etiqueta="Fecha de nacimiento" ayuda="Decide si se solicita el consentimiento del acudiente.">
              <span className="relative block">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
                <input name="fecha_nacimiento" type="date" required className={`${CLASE_CAMPO} pl-10`} />
              </span>
            </Campo>
          </div>
          <ColegioCursoCampos
            colegios={colegios.filter((c) => c.activo)}
            modo="estudiante"
            idPrefijo="adm-est"
          />
          <Campo etiqueta="Correo del acudiente" ayuda="Obligatorio si el estudiante es menor de 18 años; debe ser distinto al del estudiante.">
            <input name="correo_acudiente" type="email" maxLength={254} className={CLASE_CAMPO} />
          </Campo>
        </FormularioAdmin>
      </details>

      <FiltrosCuentas ruta="/dashboard/admin/estudiantes" colegios={colegios} cursos={cursos} valores={valores} />

      {filas.length === 0 ? (
        <VacioAdmin>No se encontraron estudiantes con esos filtros.</VacioAdmin>
      ) : (
        <div className="game-card overflow-x-auto rounded-2xl bg-paper-raised">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="border-b-2 border-line text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th scope="col" className="px-4 py-3">Estudiante</th>
                <th scope="col" className="px-4 py-3">Colegio</th>
                <th scope="col" className="px-4 py-3">Curso</th>
                <th scope="col" className="px-4 py-3">Estado</th>
                <th scope="col" className="px-4 py-3">Consentimiento</th>
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
                  <td className="px-4 py-3 text-ink-soft">{f.curso ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Insignia valor={f.activo ? "activo" : "inactivo"} etiqueta={f.activo ? "Activo" : "Inactivo"} />
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{f.consentimiento_acudiente}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link
                        href={`/dashboard/admin/estudiantes/${f.id}`}
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
                        confirmar={`¿Eliminar DEFINITIVAMENTE la cuenta de ${f.nombre} y todo su progreso? Esta acción no se puede deshacer.`}
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
          return `/dashboard/admin/estudiantes?${qs}`;
        }}
      />
    </GameModuleShell>
  );
}
