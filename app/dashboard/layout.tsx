import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GameBottomNav } from "@/components/game/game-bottom-nav";
import { FloatingAIGuide } from "@/components/game/floating-ai-guide";
import { NavegacionEducador } from "@/components/educador/navegacion-educador";

/**
 * Layout de todo /dashboard/*. Añade la navegación inferior móvil y reserva
 * el espacio inferior para que no tape el contenido de ninguna página.
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
    .select("rol")
    .eq("id", user.id)
    .single<{ rol: string }>();
  if (!perfil || !["estudiante", "educador"].includes(perfil.rol))
    redirect("/login");

  const esEducador = perfil.rol === "educador";

  return (
    <>
      {esEducador ? <NavegacionEducador /> : <GameBottomNav />}
      <div className={esEducador ? "pb-24 lg:pb-0" : "pb-44 lg:pb-0"}>
        {children}
      </div>
      {!esEducador && <FloatingAIGuide />}
    </>
  );
}
