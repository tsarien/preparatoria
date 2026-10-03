import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { xpEnNivelActual, XP_POR_NIVEL } from "@/lib/gamification";
import type { Perfil, Personaje } from "@/types/database";
import { GameHUD } from "@/components/dashboard/game-hud";
import { CaminoModulos } from "@/components/dashboard/camino-modulos";
import { rutaInicioPorRol } from "@/lib/roles";
import { MODULOS_MVP } from "@/lib/modulos";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("nombre, consentimiento_acudiente, rol, avatar_id")
    .eq("id", user.id)
    .single<
      Pick<Perfil, "nombre" | "consentimiento_acudiente" | "rol" | "avatar_id">
    >();

  // El administrador no usa el juego: va a su panel. El educador SÍ puede explorarlo (modo
  // demostración con un personaje de práctica excluido del ranking, reportes y estadísticas).
  if (perfil?.rol === "administrador") redirect(rutaInicioPorRol("administrador"));
  if (perfil?.rol !== "estudiante" && perfil?.rol !== "educador")
    redirect("/login");
  const modoDemo = perfil.rol === "educador";

  const { data: personaje } = await supabase
    .from("personajes")
    .select("id, saldo_billetera, salario_mensual, nivel, xp")
    .eq("usuario_id", user.id)
    .single<
      Pick<
        Personaje,
        "saldo_billetera" | "salario_mensual" | "nivel" | "xp"
      > & { id: string }
    >();

  // Los eventos aleatorios solo se generan para estudiantes (el cron excluye personajes demo).
  const { count: eventosPendientes } = personaje && !modoDemo
    ? await supabase
        .from("eventos_aleatorios")
        .select("id", { count: "exact", head: true })
        .eq("personaje_id", personaje.id)
        .eq("estado", "pendiente")
    : { count: 0 };

  const xpTotal = personaje?.xp ?? 0;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      {modoDemo && (
        <div
          role="note"
          className="game-card flex flex-col gap-1 rounded-2xl border-2 border-turquoise/50 bg-turquoise-soft px-4 py-3 text-sm text-ink sm:flex-row sm:items-center sm:justify-between"
        >
          <p>
            <strong>Modo demostración.</strong> Explora los módulos y retos como un
            estudiante. Tu avance aquí es de práctica y no aparece en el ranking ni en los
            reportes de tus estudiantes.
          </p>
          <Link
            href="/dashboard/educador"
            className="shrink-0 font-semibold underline underline-offset-2"
          >
            Volver al panel educativo
          </Link>
        </div>
      )}

      <GameHUD
        modoDemo={modoDemo}
        avatarId={perfil?.avatar_id}
        nombre={perfil?.nombre ?? "estudiante"}
        saldo={personaje?.saldo_billetera ?? 0}
        nivel={personaje?.nivel ?? 1}
        xpEnNivel={xpEnNivelActual(xpTotal)}
        xpPorNivel={XP_POR_NIVEL}
      />

      {/* Eventos pendientes — banner de misión */}
      {!!eventosPendientes && eventosPendientes > 0 && (
        <Link
          href="/dashboard/eventos"
          className="game-chip flex items-center justify-between gap-3 rounded-2xl border-2 border-alert/40 bg-alert-soft px-4 py-3 text-sm text-ink transition-transform duration-150 hover:-translate-y-0.5 motion-reduce:transition-none"
        >
          <span className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-alert text-xs font-bold text-white">
              {eventosPendientes}
            </span>
            <span>
              {eventosPendientes === 1
                ? "Tienes 1 evento pendiente en tu vida simulada"
                : `Tienes ${eventosPendientes} eventos pendientes`}
            </span>
          </span>
          <span className="shrink-0 font-medium underline underline-offset-2">
            Ver →
          </span>
        </Link>
      )}

      {/* Aviso consentimiento — banner informativo (no compite con el HUD) */}
      {perfil?.consentimiento_acudiente === "pendiente" && (
        <div className="game-card rounded-2xl px-4 py-3 text-sm text-ink-soft">
          Como eres menor de edad, algunas funciones se activarán cuando tu
          acudiente confirme el consentimiento (Ley 1581 de 2012).
        </div>
      )}

      {/* Mapa de aventura — protagonista */}
      <CaminoModulos modulos={[...MODULOS_MVP]} />
    </main>
  );
}
