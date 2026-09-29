"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { enviarNotificacionCambioPerfil } from "@/lib/email";
import {
  debeNotificarAcudiente,
  esAvatarValido,
  validarNombrePerfil,
} from "@/lib/perfil";

export interface ActualizarPerfilState {
  error?: string;
  mensaje?: string;
  tiposCambio?: string[];
}

const MAPA_CAMBIOS = {
  nombre: "nombre_modificado",
  correo: "correo_modificado",
  colegio_id: "colegio_modificado",
  curso: "curso_modificado",
  avatar_id: "avatar_modificado",
} as const;

export async function actualizarPerfil(
  _prevState: ActualizarPerfilState,
  formData: FormData,
): Promise<ActualizarPerfilState> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "No hay conexión con Supabase." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión expiró. Inicia sesión de nuevo." };

  const { data: perfil } = await supabase
    .from("perfiles")
    .select(
      "nombre, fecha_nacimiento, colegio_id, curso, avatar_id, correo_acudiente, rol",
    )
    .eq("id", user.id)
    .single<{
      nombre: string;
      fecha_nacimiento: string | null;
      colegio_id: string | null;
      curso: string | null;
      avatar_id: string;
      correo_acudiente: string | null;
      rol: string;
    }>();
  if (!perfil) return { error: "No se encontró tu perfil." };

  const nombre = String(formData.get("nombre") ?? "")
    .trim()
    .replace(/\s+/g, " ");
  const correo = String(formData.get("correo") ?? "")
    .trim()
    .toLowerCase();
  const colegioId = String(formData.get("colegio_id") ?? "").trim();
  const curso = String(formData.get("curso") ?? "").trim();
  const avatarId = String(formData.get("avatar_id") ?? "").trim();
  const errorNombre = validarNombrePerfil(nombre);
  if (errorNombre) return { error: errorNombre };
  if (!esAvatarValido(avatarId))
    return { error: "El avatar seleccionado no está disponible." };
  if (curso.length > 30 || (curso && !/^[\p{L}\p{M}\d -]+$/u.test(curso))) {
    return { error: "Escribe un curso de hasta 30 caracteres." };
  }
  if (perfil.rol === "educador" && colegioId !== (perfil.colegio_id ?? "")) {
    return {
      error:
        "La institución educativa solo puede modificarse con una invitación autorizada.",
    };
  }

  if (colegioId && colegioId !== perfil.colegio_id) {
    const { data: colegio } = await supabase
      .from("colegios")
      .select("id")
      .eq("id", colegioId)
      .maybeSingle<{ id: string }>();
    if (!colegio) return { error: "Selecciona un colegio válido." };
  }

  const correoActual = (user.email ?? "").toLowerCase();
  const correoCambio = correo !== correoActual;
  if (correoCambio && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    return { error: "Escribe un correo válido." };
  }

  const { data: cambiosPerfil, error: errorPerfil } = await supabase.rpc(
    "actualizar_perfil",
    {
      p_nombre: nombre,
      p_curso: curso || null,
      p_colegio_id: colegioId || null,
      p_avatar_id: avatarId,
    },
  );
  if (errorPerfil)
    return { error: "No se pudieron guardar los cambios del perfil." };
  const tiposCambio = Array.isArray(cambiosPerfil) ? cambiosPerfil : [];

  if (correoCambio) {
    const { error } = await supabase.auth.updateUser({ email: correo });
    if (error)
      return { error: "Supabase no pudo iniciar el cambio de correo." };
    tiposCambio.push(MAPA_CAMBIOS.correo);
    const { error: errorAuditoria } = await supabase.rpc(
      "registrar_cambio_correo",
    );
    if (errorAuditoria)
      return {
        error:
          "El cambio de correo inició, pero no se pudo registrar la auditoría.",
      };
  }

  if (tiposCambio.length === 0)
    return { mensaje: "No hay cambios pendientes." };

  const esMenor = debeNotificarAcudiente(
    perfil.fecha_nacimiento,
    perfil.correo_acudiente,
  );
  let estadoNotificacion: string | undefined;
  if (esMenor && perfil.correo_acudiente && tiposCambio.length > 0) {
    const resultadoCorreo = await enviarNotificacionCambioPerfil(
      perfil.correo_acudiente,
      nombre,
      tiposCambio,
    );
    estadoNotificacion = resultadoCorreo.enviado
      ? "Se notificó al acudiente."
      : "No se pudo enviar el correo al acudiente; los cambios quedaron guardados.";
  }

  revalidatePath("/dashboard/ajustes");
  revalidatePath("/dashboard");
  return {
    mensaje: [
      correoCambio
        ? "Cambios guardados. Supabase enviará instrucciones para confirmar el nuevo correo."
        : "Cambios guardados.",
      estadoNotificacion,
    ]
      .filter(Boolean)
      .join(" "),
    tiposCambio,
  };
}

export interface CambiarContrasenaState {
  error?: string;
  mensaje?: string;
}

export async function cambiarContrasena(
  _prevState: CambiarContrasenaState,
  formData: FormData,
): Promise<CambiarContrasenaState> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "No hay conexión con Supabase." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión expiró. Inicia sesión de nuevo." };

  const password = String(formData.get("password") ?? "");
  const confirmacion = String(formData.get("confirmacion") ?? "");
  if (password.length < 8)
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  if (password !== confirmacion)
    return { error: "Las contraseñas no coinciden." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error)
    return { error: "No se pudo actualizar la contraseña. Intenta de nuevo." };
  return { mensaje: "Contraseña actualizada." };
}
