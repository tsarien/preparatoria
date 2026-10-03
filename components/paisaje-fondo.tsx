import { connection } from "next/server";
import { momentoActualColombia } from "@/lib/paisaje";

const IMAGEN_POR_MOMENTO: Record<string, string> = {
  amanecer: "/paisaje/paisaje-amanecer.jpg",
  manana: "/paisaje/paisaje-manana.jpg",
  mediodia: "/paisaje/paisaje-mediodia.jpg",
  atardecer: "/paisaje/paisaje-atardecer.jpg",
  noche: "/paisaje/paisaje-noche.jpg",
};

/**
 * Fondo decorativo de la portada y las páginas de auth. La imagen cambia según
 * la hora real en Colombia (lib/paisaje.ts) — no según el modo claro/oscuro de
 * la interfaz, que es una preferencia de lectura aparte (lib/theme.ts). Por
 * eso este componente no recibe ni usa el tema para nada, solo la hora.
 *
 * `await connection()` hace que CUALQUIER página que use este componente se
 * renderice en cada petición. Sin esto, una página sin otras APIs dinámicas
 * (p. ej. /login) se prerenderiza en el build y el fondo queda congelado a la
 * hora en que se compiló, en vez de seguir la hora de Colombia.
 *
 * Es la ÚNICA fuente del fondo: Home, /login, /registro y /registro/educador
 * lo reutilizan (vía app/(auth)/layout.tsx y app/page.tsx).
 */
export async function PaisajeFondo() {
  await connection();
  const momento = momentoActualColombia();
  const imagen = IMAGEN_POR_MOMENTO[momento];

  return (
    <div
      data-testid="paisaje-fondo"
      data-momento={momento}
      className="fixed inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 bg-cover bg-bottom"
        style={{ backgroundImage: `url(${imagen})` }}
      />
    </div>
  );
}
