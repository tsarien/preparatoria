import { GameBottomNav } from "@/components/game/game-bottom-nav";

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
  return (
    <>
      <div className="pb-24 lg:pb-0">{children}</div>
      <GameBottomNav />
    </>
  );
}
