import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RegistroEducadorForm } from "./registro-educador-form";

export default async function RegistroEducadorPage() {
  const supabase = await createSupabaseServerClient();
  const { data: colegios } = supabase
    ? await supabase.from("colegios").select("id, nombre").order("nombre")
    : { data: [] as { id: string; nombre: string }[] };

  return (
    <div className="mx-auto w-full max-w-lg">
      <RegistroEducadorForm colegios={colegios ?? []} />
    </div>
  );
}
