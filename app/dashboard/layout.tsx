import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GameBottomNav } from "@/components/game/game-bottom-nav";
import { FloatingAIGuide } from "@/components/game/floating-ai-guide";
import { NavegacionEducador } from "@/components/educador/navegacion-educador";
import { NavegacionAdmin } from "@/components/admin/navegacion-admin";
import { BotonAyuda } from "@/components/soporte/boton-ayuda";

/**
 * Layout de todo /dashboard/*. Reconoce los tres roles (estudiante, educador, administrador),
 * bloquea cuentas desactivadas y añade el chrome global de cada rol:
 *   · estudiante: navegación inferior móvil + IA Guía flotante + ayuda
 *   · educador:   cabecera/navegación educativa + IA Guía flotante + ayuda
 *   · administrador: cabecera/navegación administrativa + ayuda (no usa la IA Guía)
 *
 * El control de acceso fino de cada sección (p. ej. /dashboard/admin/*) NO depende de este
 * layout: cada página y cada Server Action vuelve a verificar rol en el servidor.
 *
 * El HUD del dashboard vive dentro de /dashboard/page.tsx (no aquí) porque es
 * parte de la pantalla "mapa", no del chrome global.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardConRol>{children}</DashboardConRol>;
}

async function DashboardConRol({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol, activo, nombre")
    .eq("id", user.id)
    .single<{ rol: string; activo: boolean; nombre: string }>();
  if (!perfil) redirect("/login");
  if (!perfil.activo) redirect("/login?motivo=cuenta_desactivada");
  if (!["estudiante", "educador", "administrador"].includes(perfil.rol))
    redirect("/login");

  if (perfil.rol === "administrador") {
    return (
      <>
        <NavegacionAdmin nombre={perfil.nombre} />
        <div className="pb-24 lg:pb-0">{children}</div>
        <BotonAyuda />
      </>
    );
  }

  const esEducador = perfil.rol === "educador";

  return (
    <>
      {esEducador ? (
        <NavegacionEducador nombre={perfil.nombre} />
      ) : (
        <GameBottomNav />
      )}
      <div className={esEducador ? "pb-24 lg:pb-0" : "pb-44 lg:pb-0"}>
        {children}
      </div>
      <FloatingAIGuide />
      <BotonAyuda />
    </>
  );
}
