import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { TemaSelector } from "./tema-selector";

export default async function AjustesPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-6 py-12">
      <header className="flex flex-col gap-1">
        <Link href="/dashboard" className="text-sm text-ink-soft underline underline-offset-2">
          ← Volver al dashboard
        </Link>
        <h1 className="font-display text-3xl font-semibold text-ink">Ajustes</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Apariencia</CardTitle>
          <CardDescription>Elige cómo se ve preparatorIA en este dispositivo.</CardDescription>
        </CardHeader>
        <CardContent>
          <TemaSelector />
        </CardContent>
      </Card>
    </main>
  );
}
