import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { xpEnNivelActual, XP_POR_NIVEL } from "@/lib/gamification";
import type { Perfil, Personaje } from "@/types/database";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Button } from "@/components/ui/button";
import { cerrarSesion } from "./actions";

const MODULOS_MVP = [
  { slug: "presupuesto-personal", grupo: "Dinero", nombre: "Presupuesto personal", icono: "/iconos/icono-presupuesto.png", disponible: true },
  { slug: "detectar-estafas", grupo: "Seguridad digital", nombre: "Detectar estafas", icono: "/iconos/icono-seguridad.png", disponible: true },
  { slug: "contrato-arriendo", grupo: "Vida independiente", nombre: "Contrato de arriendo", icono: "/iconos/icono-contrato.png", disponible: true },
  { slug: "ahorro-metas", grupo: "Dinero", nombre: "Ahorro con metas", icono: "/iconos/icono-ahorro.png", disponible: true },
];

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("nombre, consentimiento_acudiente")
    .eq("id", user.id)
    .single<Pick<Perfil, "nombre" | "consentimiento_acudiente">>();

  const { data: personaje } = await supabase
    .from("personajes")
    .select("id, saldo_billetera, salario_mensual, nivel, xp")
    .eq("usuario_id", user.id)
    .single<Pick<Personaje, "saldo_billetera" | "salario_mensual" | "nivel" | "xp"> & { id: string }>();

  const { count: eventosPendientes } = personaje
    ? await supabase
        .from("eventos_aleatorios")
        .select("id", { count: "exact", head: true })
        .eq("personaje_id", personaje.id)
        .eq("estado", "pendiente")
    : { count: 0 };

  const xpTotal = personaje?.xp ?? 0;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-12">
      <header className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <Image src="/logo-icon.png" alt="" width={400} height={355} className="h-7 w-auto" priority />
          <h1 className="font-display text-3xl font-semibold text-ink">
            Hola, {perfil?.nombre ?? "estudiante"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/ajustes">
            <Button variant="ghost" size="sm">
              Ajustes
            </Button>
          </Link>
          <form action={cerrarSesion}>
            <Button variant="ghost" size="sm" type="submit">
              Cerrar sesión
            </Button>
          </form>
        </div>
      </header>

      {!!eventosPendientes && eventosPendientes > 0 && (
        <Link
          href="/dashboard/eventos"
          className="flex items-center justify-between rounded-md border border-gold bg-gold-soft px-4 py-3 text-sm text-ink transition-opacity hover:opacity-90"
        >
          <span>
            🔔 Tienes {eventosPendientes} evento{eventosPendientes === 1 ? "" : "s"} pendiente
            {eventosPendientes === 1 ? "" : "s"} en tu vida simulada
          </span>
          <span className="underline underline-offset-2">Ver →</span>
        </Link>
      )}

      {perfil?.consentimiento_acudiente === "pendiente" && (
        <div className="rounded-md border border-gold/40 bg-gold-soft p-3 text-sm text-ink">
          Tu cuenta está activa, pero como eres menor de edad, algunas funciones se habilitarán
          por completo cuando tu acudiente confirme el consentimiento (Ley 1581 de 2012).
        </div>
      )}

      {/* Mi Vida Simulada — vista rápida */}
      <Card>
        <CardHeader>
          <CardTitle>Mi Vida Simulada</CardTitle>
          <CardDescription>Tu personaje se creó automáticamente al registrarte.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-baseline justify-between">
            <span className="flex items-center gap-2 text-sm text-ink-soft">
              <Image src="/iconos/icono-saldo.png" alt="" width={200} height={179} className="h-6 w-auto" />
              Saldo en billetera
            </span>
            <span className="font-mono text-xl font-medium text-ink">
              ${(personaje?.saldo_billetera ?? 0).toLocaleString("es-CO")}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-ink-soft">Salario mensual simulado</span>
            <span className="font-mono text-sm text-ink-soft">
              ${(personaje?.salario_mensual ?? 0).toLocaleString("es-CO")}
            </span>
          </div>
          <ProgressBar
            value={xpEnNivelActual(xpTotal)}
            max={XP_POR_NIVEL}
            label={`Nivel ${personaje?.nivel ?? 1}`}
          />
          <div className="flex gap-2">
            <Link href="/dashboard/billetera">
              <Button variant="outline" size="sm">
                Ver estado financiero completo
              </Button>
            </Link>
            <Link href="/dashboard/ranking">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Image src="/iconos/icono-ranking.png" alt="" width={200} height={169} className="h-4 w-auto" />
                Ranking de mi colegio
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Módulos del MVP */}
      <div className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-medium text-ink">Tus módulos</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {MODULOS_MVP.map((m) => {
            const contenido = (
              <Card className={m.disponible ? "transition-colors hover:border-ink/30" : "opacity-70"}>
                <CardContent className="flex flex-col gap-2 p-4">
                  <div className="flex items-center justify-between">
                    <Badge tone="ink">{m.grupo}</Badge>
                    {m.icono && <Image src={m.icono} alt="" width={200} height={160} className="h-9 w-auto" />}
                  </div>
                  <p className="font-display text-base font-medium text-ink">{m.nombre}</p>
                  <p className="text-xs text-ink-soft">{m.disponible ? "Disponible" : "Próximamente"}</p>
                </CardContent>
              </Card>
            );
            return m.disponible && m.slug ? (
              <Link key={m.nombre} href={`/dashboard/modulos/${m.slug}`}>
                {contenido}
              </Link>
            ) : (
              <div key={m.nombre}>{contenido}</div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
