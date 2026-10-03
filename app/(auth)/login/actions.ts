"use server";

import { redirect } from "next/navigation";
import {
  createSupabaseServerClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { rutaInicioPorRol } from "@/lib/roles";

export interface LoginState {
  error?: string;
}

export async function iniciarSesion(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  if (!isSupabaseConfigured) {
    return {
      error:
        "Falta configurar las variables de entorno de Supabase (ver README).",
    };
  }

  const correo = String(formData.get("correo") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!correo || !password) {
    return { error: "Ingresa tu correo y tu contraseña." };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { error: "No se pudo conectar con la base de datos." };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: correo,
    password,
  });

  if (error || !data.user) {
    return { error: "Correo o contraseña incorrectos." };
  }

  // El rol sale de public.perfiles (lo escribe el servidor), no de metadatos editables.
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol, activo")
    .eq("id", data.user.id)
    .single<{ rol: string; activo: boolean }>();

  if (!perfil || !perfil.activo) {
    await supabase.auth.signOut();
    return {
      error:
        "Tu cuenta no está disponible. Si crees que es un error, contacta a tu institución.",
    };
  }

  redirect(rutaInicioPorRol(perfil.rol));
}
