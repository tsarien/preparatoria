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
 * El velo de encima (`bg-paper/NN`) sí usa el token de tema — tiñe el paisaje
 * hacia blanco o hacia oscuro según el modo de lectura activo, para que la
 * tarjeta de encima siempre tenga contraste suficiente sin importar qué tan
 * clara sea la imagen de fondo (ej. mediodía) ni qué tan oscura (ej. noche).
 */
export function PaisajeFondo() {
  const momento = momentoActualColombia();
  const imagen = IMAGEN_POR_MOMENTO[momento];

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-cover bg-bottom" style={{ backgroundImage: `url(${imagen})` }} />
      <div className="absolute inset-0 bg-paper/55" />
    </div>
  );
}
