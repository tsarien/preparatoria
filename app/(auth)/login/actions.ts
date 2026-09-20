"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export interface LoginState {
  error?: string;
}

export async function iniciarSesion(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  if (!isSupabaseConfigured) {
    return { error: "Falta configurar las variables de entorno de Supabase (ver README)." };
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

  const { error } = await supabase.auth.signInWithPassword({ email: correo, password });

  if (error) {
    return { error: "Correo o contraseña incorrectos." };
  }

  redirect("/dashboard");
}
