import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { PaisajeFondo } from "@/components/paisaje-fondo";
import { ThemeToggleButton } from "@/components/theme-toggle-button";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/dashboard");
  }

  return (
    <main className="relative flex min-h-screen flex-col">
      <PaisajeFondo />

      <header className="flex items-center justify-between px-6 py-6 sm:px-10">
        <Image src="/logo-horizontal.png" alt="preparatorIA" width={900} height={277} className="h-9 w-auto" priority />
        <ThemeToggleButton />
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-start justify-center gap-6 px-6 py-10 sm:px-10">
        <div className="flex flex-col-reverse items-start gap-6 rounded-3xl bg-paper/45 p-6 backdrop-blur-sm sm:flex-row sm:items-center">
          <div className="flex flex-col gap-6">
            <h1 className="font-display text-4xl font-semibold leading-tight text-ink drop-shadow-sm">
              Aprende a manejar la plata, los contratos y las decisiones de la vida adulta, jugando.
            </h1>
            <p className="max-w-md text-ink-soft">
              Presupuesto, contratos de arriendo, detectar estafas y ahorro — con un personaje y una
              billetera virtual que llevas contigo todos los días.
            </p>
          </div>
          <Image
            src="/mascota/mascota-celebrando.png"
            alt=""
            width={320}
            height={315}
            className="h-28 w-auto shrink-0 sm:h-32"
            priority
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/registro">
            <Button variant="primary" size="lg">
              Crear cuenta
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg" className="bg-paper/70 backdrop-blur-sm">
              Ya tengo cuenta
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
