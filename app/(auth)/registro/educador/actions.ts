"use server";

import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { esCargoEducativo, hashCodigoInvitacion } from "@/lib/educadores";
import { obtenerCursosColegio } from "@/lib/cursos-server";
import { esUuid } from "@/lib/utils";
import { validarCursosDelColegio } from "@/lib/cursos";
import { validarNombrePerfil } from "@/lib/perfil";
import { validarContrasena, validarCorreo } from "@/lib/registro";

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
  // La confirmación solo se compara aquí: NUNCA se envía a Supabase Auth ni se guarda.
  const confirmacion = String(formData.get("confirmar_password") ?? "");
  const colegioId = String(formData.get("colegio_id") ?? "").trim();
  const codigo = String(formData.get("codigo_invitacion") ?? "").trim();
  const cargo = String(formData.get("cargo") ?? "");
  const area = String(formData.get("area") ?? "").trim();
  const cursosSeleccionados = formData.getAll("cursos").map(String);

  const errorNombre = validarNombrePerfil(nombre);
  if (errorNombre) return { error: errorNombre };
  const errorCorreo = validarCorreo(correo);
  if (errorCorreo) return { error: "Revisa el correo institucional." };
  const errorContrasena = validarContrasena(password, confirmacion);
  if (errorContrasena) return { error: errorContrasena };
  if (
    !colegioId ||
    !esUuid(colegioId) ||
    !codigo ||
    !esCargoEducativo(cargo) ||
    area.length > 80 ||
    area.length === 0
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

  // Los cursos se validan contra la BD ANTES de consumir la invitación: un curso inválido
  // no debe quemar el código. El navegador nunca decide qué cursos existen.
  const { data: colegio } = await admin
    .from("colegios")
    .select("id")
    .eq("id", colegioId)
    .eq("activo", true)
    .maybeSingle();
  if (!colegio) return { error: "Selecciona un colegio válido de la lista." };

  const cursosDelColegio = await obtenerCursosColegio(admin, colegioId);
  if (cursosDelColegio.length === 0) {
    return {
      error:
        "Tu colegio aún no tiene cursos configurados. Pide al administrador de preparatorIA que los registre.",
    };
  }
  const { cursos, error: errorCursos } = validarCursosDelColegio(
    cursosSeleccionados,
    cursosDelColegio,
  );
  if (errorCursos) return { error: errorCursos };

  // Consumo atómico de la invitación: código (por hash), correo, colegio, sin usar,
  // sin revocar y sin vencer. Un solo UPDATE evita que dos registros usen el mismo código.
  const usadaEn = new Date().toISOString();
  const { data: invitacion, error: errorInvitacion } = await admin
    .from("invitaciones_educador")
    .update({ usada_en: usadaEn })
    .eq("codigo_hash", hashCodigoInvitacion(codigo))
    .eq("correo_institucional", correo)
    .eq("colegio_id", colegioId)
    .is("usada_en", null)
    .is("revocada_en", null)
    .gt("expira_en", usadaEn)
    .select("id")
    .maybeSingle();

  if (errorInvitacion || !invitacion) {
    return {
      error:
        "El código no es válido para ese correo y colegio, ya fue usado, fue revocado o venció.",
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
