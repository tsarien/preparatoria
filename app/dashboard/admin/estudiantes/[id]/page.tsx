import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GameModuleShell } from "@/components/game/game-module-shell";
import { Campo, CLASE_CAMPO, EncabezadoAdmin, Insignia } from "@/components/admin/ui";
import { FormularioAdmin } from "@/components/admin/formulario-admin";
import { ColegioCursoCampos } from "@/components/auth/colegio-curso-campos";
import { obtenerClienteServicio, requireAdmin } from "@/lib/admin-server";
import { correosPorId, listarColegiosSimple } from "@/lib/admin-datos";
import { esUuid } from "@/lib/utils";
import { actualizarEstudiante } from "../../actions";

export default async function EditarEstudiantePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!esUuid(id)) notFound();
  const servicio = obtenerClienteServicio();

  const { data: perfil } = await servicio
    .from("perfiles")
    .select("id, nombre, rol, activo, colegio_id, curso, consentimiento_acudiente")
    .eq("id", id)
    .eq("rol", "estudiante")
    .maybeSingle();
  if (!perfil) notFound();
  const [colegios, correos] = await Promise.all([listarColegiosSimple(servicio), correosPorId(servicio, [id])]);

  return (
    <GameModuleShell ancho="estandar">
      <Link
        href="/dashboard/admin/estudiantes"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-ink-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Estudiantes
      </Link>
      <EncabezadoAdmin
        etiqueta="Editar estudiante"
        titulo={perfil.nombre}
        descripcion={correos.get(id) || undefined}
        acciones={<Insignia valor={perfil.activo ? "activo" : "inactivo"} etiqueta={perfil.activo ? "Activo" : "Inactivo"} />}
      />
      <section className="game-card rounded-2xl bg-paper-raised p-4">
        <FormularioAdmin accion={actualizarEstudiante} etiquetaEnvio="Guardar cambios" reiniciar={false}>
          <input type="hidden" name="id" value={perfil.id} />
          <Campo etiqueta="Nombre completo">
            <input name="nombre" required maxLength={80} defaultValue={perfil.nombre} className={CLASE_CAMPO} />
          </Campo>
          <ColegioCursoCampos
            colegios={colegios}
            modo="estudiante"
            colegioInicial={perfil.colegio_id ?? ""}
            cursoInicial={perfil.curso ?? ""}
            idPrefijo="adm-est-ed"
          />
          <p className="text-xs text-ink-soft">
            Consentimiento del acudiente: <strong>{perfil.consentimiento_acudiente}</strong>. El correo y la
            contraseña los gestiona Supabase Auth; la fecha de nacimiento no se edita aquí.
          </p>
        </FormularioAdmin>
      </section>
    </GameModuleShell>
  );
}
