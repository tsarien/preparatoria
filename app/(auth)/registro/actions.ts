"use server";

import { redirect } from "next/navigation";
import {
  createSupabaseServerClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { enviarCorreoConsentimiento } from "@/lib/email";
import { obtenerCursosColegio } from "@/lib/cursos-server";
import { esUuid } from "@/lib/utils";
import { validarCursoEstudiante } from "@/lib/cursos";
import { validarNombrePerfil } from "@/lib/perfil";
import {
  esMenorDeEdad,
  validarContrasena,
  validarCorreo,
  validarCorreoAcudiente,
  validarFechaNacimiento,
} from "@/lib/registro";

export interface RegistroState {
  error?: string;
  needsConfirmation?: boolean;
  enlaceConsentimiento?: string;
}

export async function registrarEstudiante(
  _prevState: RegistroState,
  formData: FormData,
): Promise<RegistroState> {
  if (!isSupabaseConfigured) {
    return {
      error:
        "Falta configurar las variables de entorno de Supabase (ver README).",
    };
  }

  const nombre = String(formData.get("nombre") ?? "")
    .trim()
    .replace(/\s+/g, " ");
  const fechaNacimiento = String(formData.get("fecha_nacimiento") ?? "").trim();
  const colegioId = String(formData.get("colegio_id") ?? "").trim();
  const cursoSolicitado = String(formData.get("curso") ?? "");
  const correo = String(formData.get("correo") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  // La confirmación solo se compara aquí: NUNCA se envía a Supabase Auth ni se guarda.
  const confirmacion = String(formData.get("confirmar_password") ?? "");
  const correoAcudiente = String(formData.get("correo_acudiente") ?? "").trim();

  if (!nombre || !fechaNacimiento || !colegioId || !correo || !password) {
    return { error: "Completa todos los campos obligatorios." };
  }
  const errorNombre = validarNombrePerfil(nombre);
  if (errorNombre) return { error: errorNombre };
  const errorCorreo = validarCorreo(correo);
  if (errorCorreo) return { error: errorCorreo };
  const errorContrasena = validarContrasena(password, confirmacion);
  if (errorContrasena) return { error: errorContrasena };

  // La fecha de nacimiento es obligatoria: decide si hace falta el consentimiento del acudiente
  // (Ley 1581 de 2012). El trigger de la BD también la exige.
  const errorFecha = validarFechaNacimiento(fechaNacimiento);
  if (errorFecha) return { error: errorFecha };

  const esMenor = esMenorDeEdad(fechaNacimiento);
  if (esMenor) {
    const errorAcudiente = validarCorreoAcudiente(correoAcudiente, correo);
    if (errorAcudiente) return { error: errorAcudiente };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { error: "No se pudo conectar con la base de datos." };
  }

  // El ID proviene del selector, pero se vuelve a comprobar en el servidor
  // (la RLS solo deja ver colegios activos).
  const { data: colegioExistente, error: errorColegio } = esUuid(colegioId)
    ? await supabase
        .from("colegios")
        .select("id")
        .eq("id", colegioId)
        .eq("activo", true)
        .maybeSingle()
    : { data: null, error: null };

  if (errorColegio || !colegioExistente) {
    return { error: "Selecciona un colegio válido de la lista." };
  }

  // El curso debe pertenecer al colegio (lista configurada por el administrador).
  const cursosDelColegio = await obtenerCursosColegio(supabase, colegioId);
  const resultadoCurso = validarCursoEstudiante(cursoSolicitado, cursosDelColegio);
  if (resultadoCurso.error) return { error: resultadoCurso.error };

  // Crear la cuenta. El perfil y el personaje se crean solos vía trigger
  // (supabase/migrations/0019_trigger_roles_definitivo.sql), usando estos metadatos.
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: correo,
    password,
    options: {
      data: {
        nombre,
        fecha_nacimiento: fechaNacimiento,
        colegio_id: colegioExistente.id,
        curso: resultadoCurso.curso,
        correo_acudiente: esMenor ? correoAcudiente : null,
      },
    },
  });

  if (signUpError) {
    return { error: signUpError.message };
  }

  let enlaceConsentimiento: string | undefined;

  if (esMenor && signUpData.user) {
    // Con "Confirm email" activado en Supabase, signUp no devuelve sesión: el cliente
    // sigue siendo anónimo y RLS le oculta la solicitud (el acudiente nunca recibiría
    // el enlace). Por eso el token se lee en servidor con la service-role key; si no
    // está configurada, se usa el cliente normal (funciona cuando sí hay sesión).
    const lector = createSupabaseAdminClient() ?? supabase;
    const { data: solicitud } = await lector
      .from("solicitudes_consentimiento")
      .select("token")
      .eq("perfil_id", signUpData.user.id)
      .single<{ token: string }>();

    if (solicitud) {
      const resultadoCorreo = await enviarCorreoConsentimiento(
        correoAcudiente,
        nombre,
        solicitud.token,
      );
      // Si no hay RESEND_API_KEY configurada, no rompemos el registro — mostramos
      // el enlace directamente para que puedas probar el flujo de todos modos.
      if (!resultadoCorreo.enviado) {
        enlaceConsentimiento = resultadoCorreo.enlace;
      }
    }
  }

  // Si tu proyecto de Supabase tiene activada la confirmación por correo,
  // todavía no hay sesión — el estudiante debe confirmar antes de entrar.
  if (!signUpData.session) {
    return { needsConfirmation: true, enlaceConsentimiento };
  }

  if (enlaceConsentimiento) {
    // Mostramos el enlace de consentimiento en vez de redirigir de inmediato,
    // para que no se pierda (no hay correo real que lo respalde).
    return { enlaceConsentimiento };
  }

  redirect("/dashboard");
}
