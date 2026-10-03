"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  autorizarAdmin,
  obtenerClienteServicio,
  registrarActividad,
  type ContextoAdmin,
} from "@/lib/admin-server";
import { obtenerCursosColegio } from "@/lib/cursos-server";
import { validarCursoEstudiante, validarCursosDelColegio } from "@/lib/cursos";
import {
  expiraEn,
  parsearListaCursos,
  validarColegio,
  validarContrasenaInicial,
  validarInvitacion,
} from "@/lib/admin";
import {
  esCargoEducativo,
  generarCodigoInvitacion,
  hashCodigoInvitacion,
} from "@/lib/educadores";
import { enviarCorreoConsentimiento } from "@/lib/email";
import { validarNombrePerfil } from "@/lib/perfil";
import {
  esMenorDeEdad,
  validarCorreo,
  validarCorreoAcudiente,
  validarFechaNacimiento,
} from "@/lib/registro";
import {
  esEstadoTicket,
  esPrioridadTicket,
  validarMensajeTicket,
} from "@/lib/soporte";
import { esUuid } from "@/lib/utils";
import type { Database } from "@/types/database";
import type { EstadoAdmin } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// ACCIONES ADMINISTRATIVAS. Las Server Actions son endpoints públicos: cada una vuelve a
// verificar en el servidor la sesión (auth.getUser) y el rol (public.perfiles.rol =
// 'administrador' y activo) con autorizarAdmin(). Nada se confía a props, campos ocultos,
// cookies propias o localStorage. La service-role key solo se instancia aquí, después de esa
// verificación, y nunca llega al navegador.
// ─────────────────────────────────────────────────────────────────────────────

type Servicio = SupabaseClient<Database>;
interface Sesion {
  ctx: ContextoAdmin;
  servicio: Servicio;
}

async function iniciar(): Promise<Sesion | { error: string }> {
  const ctx = await autorizarAdmin();
  if (!ctx) return { error: "No tienes permiso para realizar esta acción." };
  try {
    return { ctx, servicio: obtenerClienteServicio() };
  } catch {
    return {
      error:
        "Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor para las operaciones administrativas.",
    };
  }
}

const texto = (fd: FormData, clave: string) => String(fd.get(clave) ?? "").trim();
const listo = (mensaje: string, extra: Partial<EstadoAdmin> = {}): EstadoAdmin => ({
  mensaje,
  ...extra,
});
const fallo = (error: string): EstadoAdmin => ({ error });

function refrescar(...rutas: string[]) {
  for (const ruta of ["/dashboard/admin", ...rutas]) revalidatePath(ruta);
}

// ─────────────────────────────── COLEGIOS ───────────────────────────────

export async function crearColegio(_p: EstadoAdmin, fd: FormData): Promise<EstadoAdmin> {
  const s = await iniciar();
  if ("error" in s) return fallo(s.error);

  const datos = { nombre: texto(fd, "nombre"), ciudad: texto(fd, "ciudad"), codigo: texto(fd, "codigo") };
  const error = validarColegio(datos);
  if (error) return fallo(error);

  const { data, error: errorInsert } = await s.servicio
    .from("colegios")
    .insert({
      nombre: datos.nombre,
      ciudad: datos.ciudad || null,
      codigo_institucional: datos.codigo || null,
    })
    .select("id")
    .single<{ id: string }>();
  if (errorInsert || !data)
    return fallo(
      errorInsert?.code === "23505"
        ? "Ya existe un colegio con ese código institucional."
        : "No se pudo crear el colegio.",
    );

  await registrarActividad(s.servicio, {
    actorId: s.ctx.usuarioId,
    accion: "colegio_creado",
    entidad: "colegio",
    entidadId: data.id,
    detalle: datos.nombre,
  });
  refrescar("/dashboard/admin/colegios");
  return listo("Colegio creado. Ahora configura sus cursos.");
}

export async function actualizarColegio(_p: EstadoAdmin, fd: FormData): Promise<EstadoAdmin> {
  const s = await iniciar();
  if ("error" in s) return fallo(s.error);

  const id = texto(fd, "id");
  const datos = { nombre: texto(fd, "nombre"), ciudad: texto(fd, "ciudad"), codigo: texto(fd, "codigo") };
  const error = !esUuid(id) ? "Colegio no encontrado." : validarColegio(datos);
  if (error) return fallo(error);

  const { error: errorUpdate } = await s.servicio
    .from("colegios")
    .update({
      nombre: datos.nombre,
      ciudad: datos.ciudad || null,
      codigo_institucional: datos.codigo || null,
      actualizado_en: new Date().toISOString(),
    })
    .eq("id", id);
  if (errorUpdate)
    return fallo(
      errorUpdate.code === "23505"
        ? "Ya existe un colegio con ese código institucional."
        : "No se pudo guardar el colegio.",
    );

  await registrarActividad(s.servicio, {
    actorId: s.ctx.usuarioId,
    accion: "colegio_editado",
    entidad: "colegio",
    entidadId: id,
    detalle: datos.nombre,
  });
  refrescar("/dashboard/admin/colegios", `/dashboard/admin/colegios/${id}`);
  return listo("Cambios guardados.");
}

export async function cambiarEstadoColegio(_p: EstadoAdmin, fd: FormData): Promise<EstadoAdmin> {
  const s = await iniciar();
  if ("error" in s) return fallo(s.error);
  const id = texto(fd, "id");
  const activo = texto(fd, "activo") === "true";
  if (!esUuid(id)) return fallo("Colegio no encontrado.");

  const { error } = await s.servicio
    .from("colegios")
    .update({ activo, actualizado_en: new Date().toISOString() })
    .eq("id", id);
  if (error) return fallo("No se pudo cambiar el estado del colegio.");

  await registrarActividad(s.servicio, {
    actorId: s.ctx.usuarioId,
    accion: activo ? "colegio_reactivado" : "colegio_desactivado",
    entidad: "colegio",
    entidadId: id,
  });
  refrescar("/dashboard/admin/colegios", `/dashboard/admin/colegios/${id}`);
  return listo(activo ? "Colegio reactivado." : "Colegio desactivado: ya no aparece en los registros.");
}

export async function eliminarColegio(_p: EstadoAdmin, fd: FormData): Promise<EstadoAdmin> {
  const s = await iniciar();
  if ("error" in s) return fallo(s.error);
  const id = texto(fd, "id");
  if (!esUuid(id)) return fallo("Colegio no encontrado.");

  // Nunca se borra información con historial asociado: en ese caso se desactiva.
  const [perfiles, invitaciones, informes] = await Promise.all([
    s.servicio.from("perfiles").select("id", { count: "exact", head: true }).eq("colegio_id", id),
    s.servicio.from("invitaciones_educador").select("id", { count: "exact", head: true }).eq("colegio_id", id),
    s.servicio.from("informes_educativos").select("id", { count: "exact", head: true }).eq("colegio_id", id),
  ]);
  if ((perfiles.count ?? 0) + (invitaciones.count ?? 0) + (informes.count ?? 0) > 0)
    return fallo(
      "Este colegio tiene cuentas, invitaciones o reportes asociados y no se puede eliminar. Desactívalo en su lugar.",
    );

  const { data: colegio } = await s.servicio.from("colegios").select("nombre").eq("id", id).maybeSingle<{ nombre: string }>();
  const { error } = await s.servicio.from("colegios").delete().eq("id", id);
  if (error) return fallo("No se pudo eliminar el colegio. Desactívalo en su lugar.");

  await registrarActividad(s.servicio, {
    actorId: s.ctx.usuarioId,
    accion: "colegio_eliminado",
    entidad: "colegio",
    entidadId: id,
    detalle: colegio?.nombre,
  });
  refrescar("/dashboard/admin/colegios");
  return listo("Colegio eliminado.");
}

// ─────────────────────────────── CURSOS ───────────────────────────────

export async function agregarCursos(_p: EstadoAdmin, fd: FormData): Promise<EstadoAdmin> {
  const s = await iniciar();
  if ("error" in s) return fallo(s.error);
  const colegioId = texto(fd, "colegio_id");
  if (!esUuid(colegioId)) return fallo("Colegio no encontrado.");
  const { cursos, error } = parsearListaCursos(texto(fd, "cursos"));
  if (error) return fallo(error);

  const { data: existentes } = await s.servicio
    .from("cursos_colegio")
    .select("nombre")
    .eq("colegio_id", colegioId);
  const ya = new Set((existentes ?? []).map((c) => String(c.nombre).trim().toLowerCase()));
  const nuevos = cursos.filter((c) => !ya.has(c.toLowerCase()));
  if (nuevos.length === 0) return fallo("Esos cursos ya existen en el colegio.");

  const { error: errorInsert } = await s.servicio
    .from("cursos_colegio")
    .insert(nuevos.map((nombre) => ({ colegio_id: colegioId, nombre })));
  if (errorInsert) return fallo("No se pudieron agregar los cursos.");

  await registrarActividad(s.servicio, {
    actorId: s.ctx.usuarioId,
    accion: "cursos_agregados",
    entidad: "colegio",
    entidadId: colegioId,
    detalle: nuevos.join(", "),
  });
  refrescar(`/dashboard/admin/colegios/${colegioId}`);
  return listo(`${nuevos.length} ${nuevos.length === 1 ? "curso agregado" : "cursos agregados"}.`);
}

async function cursoPorId(servicio: Servicio, id: string) {
  const { data } = await servicio
    .from("cursos_colegio")
    .select("id, colegio_id, nombre")
    .eq("id", id)
    .maybeSingle<{ id: string; colegio_id: string; nombre: string }>();
  return data;
}

export async function cambiarEstadoCurso(_p: EstadoAdmin, fd: FormData): Promise<EstadoAdmin> {
  const s = await iniciar();
  if ("error" in s) return fallo(s.error);
  const id = texto(fd, "id");
  const activo = texto(fd, "activo") === "true";
  const curso = esUuid(id) ? await cursoPorId(s.servicio, id) : null;
  if (!curso) return fallo("Curso no encontrado.");

  const { error } = await s.servicio.from("cursos_colegio").update({ activo }).eq("id", id);
  if (error) return fallo("No se pudo cambiar el estado del curso.");

  await registrarActividad(s.servicio, {
    actorId: s.ctx.usuarioId,
    accion: activo ? "curso_reactivado" : "curso_archivado",
    entidad: "curso",
    entidadId: id,
    detalle: curso.nombre,
  });
  refrescar(`/dashboard/admin/colegios/${curso.colegio_id}`);
  return listo(activo ? "Curso reactivado." : "Curso archivado.");
}

export async function eliminarCurso(_p: EstadoAdmin, fd: FormData): Promise<EstadoAdmin> {
  const s = await iniciar();
  if ("error" in s) return fallo(s.error);
  const id = texto(fd, "id");
  const curso = esUuid(id) ? await cursoPorId(s.servicio, id) : null;
  if (!curso) return fallo("Curso no encontrado.");

  const { error } = await s.servicio.from("cursos_colegio").delete().eq("id", id);
  if (error) return fallo("No se pudo eliminar el curso.");

  await registrarActividad(s.servicio, {
    actorId: s.ctx.usuarioId,
    accion: "curso_eliminado",
    entidad: "curso",
    entidadId: id,
    detalle: curso.nombre,
  });
  refrescar(`/dashboard/admin/colegios/${curso.colegio_id}`);
  return listo("Curso eliminado de la lista (las cuentas conservan su curso guardado).");
}

// ───────────────────────────── INVITACIONES ─────────────────────────────

/** Crea una invitación: hash en BD, código en claro solo en la respuesta (una vez). */
async function emitirInvitacion(
  s: Sesion,
  colegioId: string,
  correo: string,
  dias: number,
): Promise<EstadoAdmin> {
  const codigo = generarCodigoInvitacion();
  const { data: id, error } = await s.servicio.rpc("crear_invitacion_educador", {
    p_colegio_id: colegioId,
    p_correo_institucional: correo,
    p_codigo_hash: hashCodigoInvitacion(codigo),
    p_expira_en: expiraEn(dias),
  });
  if (error || !id) {
    return fallo(
      error?.code === "23505"
        ? "Ya hay una invitación vigente para ese correo en este colegio. Revócala o regenérala."
        : "No se pudo crear la invitación.",
    );
  }
  await s.servicio.from("invitaciones_educador").update({ creada_por: s.ctx.usuarioId }).eq("id", String(id));
  await registrarActividad(s.servicio, {
    actorId: s.ctx.usuarioId,
    accion: "invitacion_generada",
    entidad: "invitacion",
    entidadId: String(id),
    detalle: correo, // nunca el código
  });
  refrescar(`/dashboard/admin/colegios/${colegioId}`, "/dashboard/admin/educadores");
  return listo(`Invitación creada para ${correo}. Copia el código ahora: no se vuelve a mostrar.`, {
    codigo,
    codigoCorreo: correo,
  });
}

export async function generarInvitacion(_p: EstadoAdmin, fd: FormData): Promise<EstadoAdmin> {
  const s = await iniciar();
  if ("error" in s) return fallo(s.error);
  const colegioId = texto(fd, "colegio_id");
  const correo = texto(fd, "correo").toLowerCase();
  const dias = Number(texto(fd, "dias"));
  const error = !esUuid(colegioId) ? "Selecciona un colegio." : validarInvitacion(correo, dias);
  if (error) return fallo(error);

  const { data: colegio } = await s.servicio
    .from("colegios")
    .select("id")
    .eq("id", colegioId)
    .eq("activo", true)
    .maybeSingle();
  if (!colegio) return fallo("El colegio no existe o está desactivado.");
  return emitirInvitacion(s, colegioId, correo, dias);
}

export async function regenerarInvitacion(_p: EstadoAdmin, fd: FormData): Promise<EstadoAdmin> {
  const s = await iniciar();
  if ("error" in s) return fallo(s.error);
  const id = texto(fd, "id");
  const dias = Number(texto(fd, "dias") || "7");
  if (!esUuid(id)) return fallo("Invitación no encontrada.");

  const { data: previa } = await s.servicio
    .from("invitaciones_educador")
    .select("id, colegio_id, correo_institucional, usada_en")
    .eq("id", id)
    .maybeSingle<{ id: string; colegio_id: string; correo_institucional: string; usada_en: string | null }>();
  if (!previa) return fallo("Invitación no encontrada.");
  if (previa.usada_en) return fallo("Esa invitación ya fue usada: no se puede regenerar.");
  const error = validarInvitacion(previa.correo_institucional, dias);
  if (error) return fallo(error);

  // Revoca la anterior y emite una nueva (el índice único solo admite una vigente por correo).
  await s.servicio
    .from("invitaciones_educador")
    .update({ revocada_en: new Date().toISOString() })
    .eq("id", id)
    .is("usada_en", null)
    .is("revocada_en", null);
  return emitirInvitacion(s, previa.colegio_id, previa.correo_institucional, dias);
}

export async function revocarInvitacion(_p: EstadoAdmin, fd: FormData): Promise<EstadoAdmin> {
  const s = await iniciar();
  if ("error" in s) return fallo(s.error);
  const id = texto(fd, "id");
  if (!esUuid(id)) return fallo("Invitación no encontrada.");

  const { data, error } = await s.servicio
    .from("invitaciones_educador")
    .update({ revocada_en: new Date().toISOString() })
    .eq("id", id)
    .is("usada_en", null)
    .is("revocada_en", null)
    .select("colegio_id, correo_institucional")
    .maybeSingle<{ colegio_id: string; correo_institucional: string }>();
  if (error || !data) return fallo("No se pudo revocar: ya fue usada o revocada.");

  await registrarActividad(s.servicio, {
    actorId: s.ctx.usuarioId,
    accion: "invitacion_revocada",
    entidad: "invitacion",
    entidadId: id,
    detalle: data.correo_institucional,
  });
  refrescar(`/dashboard/admin/colegios/${data.colegio_id}`, "/dashboard/admin/educadores");
  return listo("Invitación revocada.");
}

// ───────────────────────────── CUENTAS ─────────────────────────────

async function colegioActivo(servicio: Servicio, id: string) {
  if (!esUuid(id)) return false;
  const { data } = await servicio.from("colegios").select("id").eq("id", id).eq("activo", true).maybeSingle();
  return Boolean(data);
}

export async function crearEstudiante(_p: EstadoAdmin, fd: FormData): Promise<EstadoAdmin> {
  const s = await iniciar();
  if ("error" in s) return fallo(s.error);

  const nombre = texto(fd, "nombre").replace(/\s+/g, " ");
  const correo = texto(fd, "correo").toLowerCase();
  const password = String(fd.get("password") ?? "");
  const fecha = texto(fd, "fecha_nacimiento");
  const colegioId = texto(fd, "colegio_id");
  const correoAcudiente = texto(fd, "correo_acudiente");

  const error =
    validarNombrePerfil(nombre) ??
    (validarCorreo(correo) ? "Escribe un correo válido." : null) ??
    validarContrasenaInicial(password) ??
    validarFechaNacimiento(fecha);
  if (error) return fallo(error);
  const esMenor = esMenorDeEdad(fecha);
  if (esMenor) {
    const errorAcudiente = validarCorreoAcudiente(correoAcudiente, correo);
    if (errorAcudiente) return fallo(errorAcudiente);
  }
  if (!(await colegioActivo(s.servicio, colegioId))) return fallo("Selecciona un colegio válido.");
  const cursos = await obtenerCursosColegio(s.servicio, colegioId);
  const resultadoCurso = validarCursoEstudiante(texto(fd, "curso"), cursos);
  if (resultadoCurso.error) return fallo(resultadoCurso.error);

  const { data, error: errorAuth } = await s.servicio.auth.admin.createUser({
    email: correo,
    password, // viaja a Supabase Auth; nunca se guarda en public.perfiles
    email_confirm: true,
    user_metadata: {
      nombre,
      fecha_nacimiento: fecha,
      colegio_id: colegioId,
      curso: resultadoCurso.curso,
      correo_acudiente: esMenor ? correoAcudiente : null,
    },
  });
  if (errorAuth || !data.user)
    return fallo("No se pudo crear la cuenta (¿el correo ya está registrado?).");

  let aviso = "";
  if (esMenor) {
    const { data: solicitud } = await s.servicio
      .from("solicitudes_consentimiento")
      .select("token")
      .eq("perfil_id", data.user.id)
      .maybeSingle<{ token: string }>();
    if (solicitud) {
      const r = await enviarCorreoConsentimiento(correoAcudiente, nombre, solicitud.token);
      aviso = r.enviado
        ? " Se envió la solicitud de consentimiento al acudiente."
        : ` El correo no se pudo enviar; enlace de consentimiento: ${r.enlace}`;
    }
  }

  await registrarActividad(s.servicio, {
    actorId: s.ctx.usuarioId,
    accion: "cuenta_creada",
    entidad: "perfil",
    entidadId: data.user.id,
    detalle: "rol=estudiante",
  });
  refrescar("/dashboard/admin/estudiantes");
  return listo(`Cuenta de estudiante creada.${aviso}`);
}

export async function crearEducador(_p: EstadoAdmin, fd: FormData): Promise<EstadoAdmin> {
  const s = await iniciar();
  if ("error" in s) return fallo(s.error);

  const nombre = texto(fd, "nombre").replace(/\s+/g, " ");
  const correo = texto(fd, "correo").toLowerCase();
  const password = String(fd.get("password") ?? "");
  const colegioId = texto(fd, "colegio_id");
  const cargo = texto(fd, "cargo");
  const area = texto(fd, "area");

  const error =
    validarNombrePerfil(nombre) ??
    (validarCorreo(correo) ? "Escribe un correo válido." : null) ??
    validarContrasenaInicial(password) ??
    (!esCargoEducativo(cargo) || area.length === 0 || area.length > 80
      ? "Indica el cargo y el área."
      : null);
  if (error) return fallo(error);
  if (!(await colegioActivo(s.servicio, colegioId))) return fallo("Selecciona un colegio válido.");
  const disponibles = await obtenerCursosColegio(s.servicio, colegioId);
  const { cursos, error: errorCursos } = validarCursosDelColegio(fd.getAll("cursos").map(String), disponibles);
  if (errorCursos) return fallo(errorCursos);

  const { data, error: errorAuth } = await s.servicio.auth.admin.createUser({
    email: correo,
    password,
    email_confirm: true,
    app_metadata: { rol: "educador", colegio_id: colegioId },
    user_metadata: { nombre, cargo_educativo: cargo, area_educativa: area, cursos_educativos: cursos },
  });
  if (errorAuth || !data.user)
    return fallo("No se pudo crear la cuenta (¿el correo ya está registrado?).");

  await registrarActividad(s.servicio, {
    actorId: s.ctx.usuarioId,
    accion: "cuenta_creada",
    entidad: "perfil",
    entidadId: data.user.id,
    detalle: "rol=educador",
  });
  refrescar("/dashboard/admin/educadores");
  return listo("Cuenta de educador creada.");
}

async function perfilGestionable(servicio: Servicio, id: string, rol?: "estudiante" | "educador") {
  if (!esUuid(id)) return null;
  const { data } = await servicio
    .from("perfiles")
    .select("id, rol, nombre, colegio_id")
    .eq("id", id)
    .maybeSingle<{ id: string; rol: string; nombre: string; colegio_id: string | null }>();
  if (!data || data.rol === "administrador") return null; // los administradores no se gestionan aquí
  if (rol && data.rol !== rol) return null;
  return data;
}

export async function actualizarEstudiante(_p: EstadoAdmin, fd: FormData): Promise<EstadoAdmin> {
  const s = await iniciar();
  if ("error" in s) return fallo(s.error);
  const id = texto(fd, "id");
  const perfil = await perfilGestionable(s.servicio, id, "estudiante");
  if (!perfil) return fallo("Estudiante no encontrado.");

  const nombre = texto(fd, "nombre").replace(/\s+/g, " ");
  const colegioId = texto(fd, "colegio_id");
  const errorNombre = validarNombrePerfil(nombre);
  if (errorNombre) return fallo(errorNombre);
  if (!(await colegioActivo(s.servicio, colegioId)) && colegioId !== perfil.colegio_id)
    return fallo("Selecciona un colegio válido.");
  const cursos = await obtenerCursosColegio(s.servicio, colegioId);
  const resultado = validarCursoEstudiante(texto(fd, "curso"), cursos);
  if (resultado.error) return fallo(resultado.error);

  const { error } = await s.servicio
    .from("perfiles")
    .update({ nombre, colegio_id: colegioId, curso: resultado.curso || null })
    .eq("id", id)
    .eq("rol", "estudiante");
  if (error) return fallo("No se pudieron guardar los cambios.");

  await registrarActividad(s.servicio, {
    actorId: s.ctx.usuarioId,
    accion: "cuenta_editada",
    entidad: "perfil",
    entidadId: id,
    detalle: "rol=estudiante",
  });
  refrescar("/dashboard/admin/estudiantes", `/dashboard/admin/estudiantes/${id}`);
  return listo("Cambios guardados.");
}

export async function actualizarEducador(_p: EstadoAdmin, fd: FormData): Promise<EstadoAdmin> {
  const s = await iniciar();
  if ("error" in s) return fallo(s.error);
  const id = texto(fd, "id");
  const perfil = await perfilGestionable(s.servicio, id, "educador");
  if (!perfil) return fallo("Educador no encontrado.");

  const nombre = texto(fd, "nombre").replace(/\s+/g, " ");
  const colegioId = texto(fd, "colegio_id");
  const cargo = texto(fd, "cargo");
  const area = texto(fd, "area");
  const error =
    validarNombrePerfil(nombre) ??
    (!esCargoEducativo(cargo) || area.length === 0 || area.length > 80 ? "Indica el cargo y el área." : null);
  if (error) return fallo(error);
  if (!(await colegioActivo(s.servicio, colegioId)) && colegioId !== perfil.colegio_id)
    return fallo("Selecciona un colegio válido.");
  const disponibles = await obtenerCursosColegio(s.servicio, colegioId);
  const { cursos, error: errorCursos } = validarCursosDelColegio(fd.getAll("cursos").map(String), disponibles);
  if (errorCursos) return fallo(errorCursos);

  const { error: errorUpdate } = await s.servicio
    .from("perfiles")
    .update({ nombre, colegio_id: colegioId, cargo_educativo: cargo, area_educativa: area, cursos_educativos: cursos })
    .eq("id", id)
    .eq("rol", "educador");
  if (errorUpdate) return fallo("No se pudieron guardar los cambios.");

  await registrarActividad(s.servicio, {
    actorId: s.ctx.usuarioId,
    accion: "cuenta_editada",
    entidad: "perfil",
    entidadId: id,
    detalle: "rol=educador",
  });
  refrescar("/dashboard/admin/educadores", `/dashboard/admin/educadores/${id}`);
  return listo("Cambios guardados.");
}

export async function cambiarEstadoCuenta(_p: EstadoAdmin, fd: FormData): Promise<EstadoAdmin> {
  const s = await iniciar();
  if ("error" in s) return fallo(s.error);
  const id = texto(fd, "id");
  const activo = texto(fd, "activo") === "true";
  if (id === s.ctx.usuarioId) return fallo("No puedes cambiar el estado de tu propia cuenta.");
  const perfil = await perfilGestionable(s.servicio, id);
  if (!perfil) return fallo("Cuenta no encontrada.");

  const { error } = await s.servicio.from("perfiles").update({ activo }).eq("id", id);
  if (error) return fallo("No se pudo cambiar el estado de la cuenta.");

  // Además se bloquea/desbloquea el inicio de sesión en Supabase Auth.
  const { error: errorBloqueo } = await s.servicio.auth.admin.updateUserById(id, {
    ban_duration: activo ? "none" : "876000h",
  });

  await registrarActividad(s.servicio, {
    actorId: s.ctx.usuarioId,
    accion: activo ? "cuenta_reactivada" : "cuenta_desactivada",
    entidad: "perfil",
    entidadId: id,
    detalle: `rol=${perfil.rol}`,
  });
  refrescar(`/dashboard/admin/${perfil.rol === "educador" ? "educadores" : "estudiantes"}`);
  return errorBloqueo
    ? listo(
        "La cuenta quedó marcada, pero no se pudo actualizar el bloqueo de inicio de sesión en Supabase Auth. La plataforma igualmente le impide el acceso.",
      )
    : listo(activo ? "Cuenta reactivada." : "Cuenta desactivada: ya no puede iniciar sesión.");
}

export async function eliminarCuenta(_p: EstadoAdmin, fd: FormData): Promise<EstadoAdmin> {
  const s = await iniciar();
  if ("error" in s) return fallo(s.error);
  const id = texto(fd, "id");
  if (id === s.ctx.usuarioId) return fallo("No puedes eliminar tu propia cuenta.");
  const perfil = await perfilGestionable(s.servicio, id);
  if (!perfil) return fallo("Cuenta no encontrada.");

  const { error: errorDatos } = await s.servicio.rpc("eliminar_datos_usuario", { p_usuario_id: id });
  if (errorDatos) return fallo("No se pudieron eliminar los datos de la cuenta. Desactívala en su lugar.");
  const { error: errorAuth } = await s.servicio.auth.admin.deleteUser(id);

  await registrarActividad(s.servicio, {
    actorId: s.ctx.usuarioId,
    accion: "cuenta_eliminada",
    entidad: "perfil",
    entidadId: id,
    detalle: `rol=${perfil.rol}`,
  });
  refrescar(`/dashboard/admin/${perfil.rol === "educador" ? "educadores" : "estudiantes"}`);
  return errorAuth
    ? listo("Se eliminaron los datos, pero el usuario de Supabase Auth no se pudo borrar; revísalo en el panel de Supabase.")
    : listo("Cuenta eliminada.");
}

// ─────────────────────────────── TICKETS ───────────────────────────────
// Se ejecutan con la SESIÓN del administrador (no con la service-role): las funciones SQL
// responder_ticket y gestionar_ticket vuelven a comprobar el rol dentro de la base de datos.

export async function responderTicketAdmin(_p: EstadoAdmin, fd: FormData): Promise<EstadoAdmin> {
  const ctx = await autorizarAdmin();
  if (!ctx) return fallo("No tienes permiso para realizar esta acción.");
  const id = texto(fd, "ticket_id");
  const mensaje = String(fd.get("mensaje") ?? "");
  const error = !esUuid(id) ? "Ticket no encontrado." : validarMensajeTicket(mensaje);
  if (error) return fallo(error);

  const { error: errorRpc } = await ctx.supabase.rpc("responder_ticket", {
    p_ticket_id: id,
    p_mensaje: mensaje.trim(),
  });
  if (errorRpc) return fallo("No se pudo enviar la respuesta.");
  refrescar("/dashboard/admin/tickets", `/dashboard/admin/tickets/${id}`);
  return listo("Respuesta enviada.");
}

export async function gestionarTicketAdmin(_p: EstadoAdmin, fd: FormData): Promise<EstadoAdmin> {
  const ctx = await autorizarAdmin();
  if (!ctx) return fallo("No tienes permiso para realizar esta acción.");
  const id = texto(fd, "ticket_id");
  const estado = texto(fd, "estado");
  const prioridad = texto(fd, "prioridad");
  const asignar = texto(fd, "asignado");
  if (!esUuid(id)) return fallo("Ticket no encontrado.");
  if (estado && !esEstadoTicket(estado)) return fallo("Estado inválido.");
  if (prioridad && !esPrioridadTicket(prioridad)) return fallo("Prioridad inválida.");

  const { error } = await ctx.supabase.rpc("gestionar_ticket", {
    p_ticket_id: id,
    p_estado: estado || null,
    p_prioridad: prioridad || null,
    // "yo" = asignarme; "ninguno" = quitar asignación; vacío = no cambiar
    p_asignado_id: asignar === "yo" ? ctx.usuarioId : null,
    p_asignar: asignar === "yo" || asignar === "ninguno",
  });
  if (error) return fallo("No se pudo actualizar el ticket.");
  refrescar("/dashboard/admin/tickets", `/dashboard/admin/tickets/${id}`);
  return listo("Ticket actualizado.");
}
