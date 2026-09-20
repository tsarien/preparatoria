import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RegistroForm } from "./registro-form";

export default async function RegistroPage() {
  const supabase = await createSupabaseServerClient();
  const { data: colegios } = supabase
    ? await supabase.from("colegios").select("nombre").order("nombre")
    : { data: [] as { nombre: string }[] };

  return (
    <div className="mx-auto w-full max-w-md">
      <RegistroForm colegios={colegios ?? []} />
    </div>
  );
}
