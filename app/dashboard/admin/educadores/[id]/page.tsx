import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GameModuleShell } from "@/components/game/game-module-shell";
import { Campo, CLASE_CAMPO, EncabezadoAdmin, Insignia } from "@/components/admin/ui";
import { FormularioAdmin } from "@/components/admin/formulario-admin";
import { ColegioCursoCampos } from "@/components/auth/colegio-curso-campos";
import { obtenerClienteServicio, requireAdmin } from "@/lib/admin-server";
import { correosPorId, listarColegiosSimple } from "@/lib/admin-datos";
import { CARGOS_EDUCATIVOS } from "@/lib/educadores";
import { esUuid } from "@/lib/utils";
import { actualizarEducador } from "../../actions";

export default async function EditarEducadorPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!esUuid(id)) notFound();
  const servicio = obtenerClienteServicio();

  const { data: perfil } = await servicio
    .from("perfiles")
    .select("id, nombre, activo, colegio_id, cargo_educativo, area_educativa, cursos_educativos")
    .eq("id", id)
    .eq("rol", "educador")
    .maybeSingle();
  if (!perfil) notFound();
  const [colegios, correos] = await Promise.all([listarColegiosSimple(servicio), correosPorId(servicio, [id])]);

  return (
    <GameModuleShell ancho="estandar">
      <Link
        href="/dashboard/admin/educadores"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-ink-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Educadores
      </Link>
      <EncabezadoAdmin
        etiqueta="Editar educador"
        titulo={perfil.nombre}
        descripcion={correos.get(id) || undefined}
        acciones={<Insignia valor={perfil.activo ? "activo" : "inactivo"} etiqueta={perfil.activo ? "Activo" : "Inactivo"} />}
      />
      <section className="game-card rounded-2xl bg-paper-raised p-4">
        <FormularioAdmin accion={actualizarEducador} etiquetaEnvio="Guardar cambios" reiniciar={false}>
          <input type="hidden" name="id" value={perfil.id} />
          <Campo etiqueta="Nombre completo">
            <input name="nombre" required maxLength={80} defaultValue={perfil.nombre} className={CLASE_CAMPO} />
          </Campo>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo etiqueta="Cargo">
              <select name="cargo" required defaultValue={perfil.cargo_educativo ?? ""} className={CLASE_CAMPO}>
                <option value="" disabled>Selecciona</option>
                {CARGOS_EDUCATIVOS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Área o asignatura">
              <input name="area" required maxLength={80} defaultValue={perfil.area_educativa ?? ""} className={CLASE_CAMPO} />
            </Campo>
          </div>
          <ColegioCursoCampos
            colegios={colegios}
            modo="educador"
            colegioInicial={perfil.colegio_id ?? ""}
            cursosIniciales={perfil.cursos_educativos ?? []}
            idPrefijo="adm-edu-ed"
          />
        </FormularioAdmin>
      </section>
    </GameModuleShell>
  );
}
