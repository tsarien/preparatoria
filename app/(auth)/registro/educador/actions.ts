"use server";

import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import {
  esCargoEducativo,
  hashCodigoInvitacion,
  normalizarCursosEducativos,
} from "@/lib/educadores";

export interface RegistroEducadorState {
  error?: string;
  creada?: boolean;
}

export async function registrarEducador(
  _prevState: RegistroEducadorState,
  formData: FormData,
): Promise<RegistroEducadorState> {
  const nombre = String(formData.get("nombre") ?? "")
    .trim()
    .replace(/\s+/g, " ");
  const correo = String(formData.get("correo") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const colegioId = String(formData.get("colegio_id") ?? "").trim();
  const codigo = String(formData.get("codigo_invitacion") ?? "").trim();
  const cargo = String(formData.get("cargo") ?? "");
  const area = String(formData.get("area") ?? "").trim();
  const cursos = normalizarCursosEducativos(
    String(formData.get("cursos") ?? ""),
  );

  if (
    nombre.length < 2 ||
    nombre.length > 80 ||
    !/^[\p{L}\p{M} .'-]+$/u.test(nombre)
  ) {
    return { error: "Escribe un nombre válido de hasta 80 caracteres." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) || password.length < 8) {
    return {
      error:
        "Revisa el correo institucional y usa una contraseña de al menos 8 caracteres.",
    };
  }
  if (
    !colegioId ||
    !codigo ||
    !esCargoEducativo(cargo) ||
    area.length > 80 ||
    cursos.length === 0
  ) {
    return {
      error: "Completa los datos educativos y el código de invitación.",
    };
  }
  if (!isSupabaseAdminConfigured) {
    return {
      error:
        "El registro educativo requiere configurar el acceso administrativo seguro de Supabase.",
    };
  }

  const admin = createSupabaseAdminClient();
  if (!admin)
    return { error: "No se pudo conectar con el servicio de registro." };

  const usadaEn = new Date().toISOString();
  const { data: invitacion, error: errorInvitacion } = await admin
    .from("invitaciones_educador")
    .update({ usada_en: usadaEn })
    .eq("codigo_hash", hashCodigoInvitacion(codigo))
    .eq("correo_institucional", correo)
    .eq("colegio_id", colegioId)
    .is("usada_en", null)
    .gt("expira_en", usadaEn)
    .select("id")
    .maybeSingle();

  if (errorInvitacion || !invitacion) {
    return {
      error:
        "El código no es válido para ese correo y colegio, ya fue usado o venció.",
    };
  }

  const { error: errorUsuario } = await admin.auth.admin.createUser({
    email: correo,
    password,
    email_confirm: true,
    app_metadata: { rol: "educador", colegio_id: colegioId },
    user_metadata: {
      nombre,
      cargo_educativo: cargo,
      area_educativa: area,
      cursos_educativos: cursos,
    },
  });

  if (errorUsuario) {
    await admin
      .from("invitaciones_educador")
      .update({ usada_en: null })
      .eq("id", invitacion.id)
      .eq("usada_en", usadaEn);
    return {
      error:
        "No se pudo crear la cuenta. Revisa los datos o inicia sesión si ya tienes una cuenta.",
    };
  }

  return { creada: true };
}
