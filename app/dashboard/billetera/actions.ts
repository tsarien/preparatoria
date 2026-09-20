"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { registrarTransaccion, otorgarXp, type TipoTransaccion } from "@/lib/wallet";

export interface BilleteraState {
  error?: string;
  success?: boolean;
}

async function idPersonajeActual(supabase: SupabaseClient): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("personajes").select("id").eq("usuario_id", user.id).single();
  return (data?.id as string | undefined) ?? null;
}

export async function simularTransaccion(
  _prevState: BilleteraState,
  formData: FormData
): Promise<BilleteraState> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "No hay conexión con Supabase." };

  const personajeId = await idPersonajeActual(supabase);
  if (!personajeId) return { error: "No se encontró tu personaje. Inicia sesión de nuevo." };

  const tipo = String(formData.get("tipo")) as TipoTransaccion;
  const monto = Number(formData.get("monto"));
  const categoria = String(formData.get("categoria") ?? "").trim() || undefined;
  const descripcion = String(formData.get("descripcion") ?? "").trim() || undefined;

  const resultado = await registrarTransaccion(supabase, {
    personajeId,
    tipo,
    monto,
    categoria,
    descripcion,
    origen: "prueba:fase-2",
  });

  if (!resultado.success) return { error: resultado.error };

  revalidatePath("/dashboard/billetera");
  revalidatePath("/dashboard");
  return { success: true };
}

/** Botón de prueba: otorga 50 XP fijos, sin formulario, para probar la barra de nivel. */
export async function simularXp() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return;

  const personajeId = await idPersonajeActual(supabase);
  if (!personajeId) return;

  await otorgarXp(supabase, personajeId, 50);
  revalidatePath("/dashboard/billetera");
  revalidatePath("/dashboard");
}
