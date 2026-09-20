"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { enviarCorreoConsentimiento } from "@/lib/email";

export interface RegistroState {
  error?: string;
  needsConfirmation?: boolean;
  enlaceConsentimiento?: string;
}

function calcularEdad(fechaNacimiento: string): number {
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const noHaCumplidoAunEsteAno =
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());
  if (noHaCumplidoAunEsteAno) edad -= 1;
  return edad;
}

export async function registrarEstudiante(
  _prevState: RegistroState,
  formData: FormData
): Promise<RegistroState> {
  if (!isSupabaseConfigured) {
    return { error: "Falta configurar las variables de entorno de Supabase (ver README)." };
  }

  const nombre = String(formData.get("nombre") ?? "").trim();
  const fechaNacimiento = String(formData.get("fecha_nacimiento") ?? "");
  const colegioNombre = String(formData.get("colegio") ?? "").trim();
  const curso = String(formData.get("curso") ?? "").trim();
  const correo = String(formData.get("correo") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const correoAcudiente = String(formData.get("correo_acudiente") ?? "").trim();

  if (!nombre || !fechaNacimiento || !colegioNombre || !correo || !password) {
    return { error: "Completa todos los campos obligatorios." };
  }
  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }

  const esMenor = calcularEdad(fechaNacimiento) < 18;
  if (esMenor && !correoAcudiente) {
    return { error: "Como eres menor de edad, necesitamos el correo de tu acudiente." };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { error: "No se pudo conectar con la base de datos." };
  }

  // 1. Buscar el colegio por nombre (sin distinguir mayúsculas/minúsculas); si no existe, crearlo.
  const { data: colegioExistente } = await supabase
    .from("colegios")
    .select("id")
    .ilike("nombre", colegioNombre)
    .maybeSingle();

  let colegioId = colegioExistente?.id as string | undefined;

  if (!colegioId) {
    const { data: colegioNuevo, error: errorColegio } = await supabase
      .from("colegios")
      .insert({ nombre: colegioNombre })
      .select("id")
      .single();

    if (errorColegio || !colegioNuevo) {
      return { error: "No se pudo registrar el colegio. Intenta de nuevo." };
    }
    colegioId = colegioNuevo.id as string;
  }

  // 2. Crear la cuenta. El perfil y el personaje se crean solos vía trigger
  //    (ver supabase/migrations/0002_auth_perfil_trigger.sql), usando estos metadatos.
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: correo,
    password,
    options: {
      data: {
        nombre,
        fecha_nacimiento: fechaNacimiento,
        colegio_id: colegioId,
        curso,
        correo_acudiente: esMenor ? correoAcudiente : null,
      },
    },
  });

  if (signUpError) {
    return { error: signUpError.message };
  }

  let enlaceConsentimiento: string | undefined;

  if (esMenor && signUpData.user) {
    const { data: solicitud } = await supabase
      .from("solicitudes_consentimiento")
      .select("token")
      .eq("perfil_id", signUpData.user.id)
      .single<{ token: string }>();

    if (solicitud) {
      const resultadoCorreo = await enviarCorreoConsentimiento(correoAcudiente, nombre, solicitud.token);
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
