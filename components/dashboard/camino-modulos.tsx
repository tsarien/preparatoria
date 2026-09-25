import Link from "next/link";
import Image from "next/image";
import { momentoActualColombia, type MomentoDia } from "@/lib/paisaje";
import { cn } from "@/lib/utils";

export interface ModuloCamino {
  slug: string;
  grupo: string;
  nombre: string;
  icono: string;
  disponible: boolean;
  /**
   * Opcional. Cuando conectes `progreso_usuario_reto` a esta página, pasa
   * aquí el estado real de cada módulo. Mientras esa data no exista, todos
   * los nodos se muestran "disponibles" (nunca bloqueados) y ninguno se
   * marca como completado — es mejor mostrar menos que mostrar progreso
   * falso.
   */
  estado?: "completado" | "en-progreso";
}

interface CaminoModulosProps {
  modulos: ModuloCamino[];
  /** Slug del módulo que la mascota señala como "siguiente". Por defecto, el primero sin completar. */
  moduloActivoSlug?: string;
}

const IMAGEN_POR_MOMENTO: Record<MomentoDia, string> = {
  amanecer: "/paisaje/paisaje-amanecer.jpg",
  manana: "/paisaje/paisaje-manana.jpg",
  mediodia: "/paisaje/paisaje-mediodia.jpg",
  atardecer: "/paisaje/paisaje-atardecer.jpg",
  noche: "/paisaje/paisaje-noche.jpg",
};

// % horizontal del ancho del camino donde se ubica cada nodo, alternando
// izquierda/derecha para el efecto serpenteante (se recicla en ciclos de a
// dos si hay más de 2 módulos). Todo en porcentaje -> no depende del ancho
// real del contenedor, por eso no hay lógica aparte para mobile.
const OFFSETS_X = [24, 70];
const ALTO_TRAMO = 128; // px entre el centro de un nodo y el siguiente
const MARGEN_INFERIOR = 90; // espacio para que el último nodo + etiqueta no se corten

export function CaminoModulos({ modulos, moduloActivoSlug }: CaminoModulosProps) {
  const activo =
    moduloActivoSlug ?? modulos.find((m) => m.estado !== "completado")?.slug ?? modulos[0]?.slug;

  const alturaCamino = ALTO_TRAMO * Math.max(modulos.length - 1, 0) + MARGEN_INFERIOR;

  const puntos = modulos.map((_, i) => ({
    x: OFFSETS_X[i % OFFSETS_X.length],
    y: i * ALTO_TRAMO + 40,
  }));

  // Curva suave que conecta el centro de cada nodo con el siguiente.
  const trazo = puntos
    .map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const anterior = puntos[i - 1];
      const yMedio = (anterior.y + p.y) / 2;
      return `C ${anterior.x} ${yMedio}, ${p.x} ${yMedio}, ${p.x} ${p.y}`;
    })
    .join(" ");

  const momento = momentoActualColombia();
  const imagenFondo = IMAGEN_POR_MOMENTO[momento];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-line">
      {/* Paisaje de fondo, igual al de portada/login pero atenuado: el
          dashboard se ve muchas veces por sesión, así que aquí solo debe
          ambientar, no competir con la información real. */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: `url(${imagenFondo})` }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-paper/75" aria-hidden="true" />

      <div className="relative px-4 pb-6 pt-5">
        <h2 className="mb-4 font-display text-lg font-medium text-ink">Tus módulos</h2>

        <div className="relative" style={{ height: alturaCamino }}>
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox={`0 0 100 ${alturaCamino}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d={trazo}
              fill="none"
              stroke="var(--color-line)"
              strokeWidth={5}
              strokeLinecap="round"
              strokeDasharray="2 12"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {modulos.map((m, i) => {
            const { x, y } = puntos[i];
            const esActivo = m.slug === activo;
            const completado = m.estado === "completado";

            const contenidoNodo = (
              <>
                {esActivo && (
                  <Image
                    src="/mascota/mascota-neutral.png"
                    alt=""
                    width={160}
                    height={160}
                    className="absolute left-1/2 -top-[4.25rem] h-14 w-auto -translate-x-1/2"
                  />
                )}
                <div
                  className={cn(
                    "relative flex h-20 w-20 items-center justify-center rounded-full border-[3px] bg-paper-raised shadow-[0_3px_0_rgba(31,36,48,0.15)] transition-transform hover:-translate-y-0.5",
                    completado
                      ? "border-growth"
                      : esActivo
                        ? "border-gold"
                        : "border-primary/35"
                  )}
                >
                  <Image src={m.icono} alt="" width={200} height={160} className="h-10 w-auto" />
                  {completado && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-paper bg-growth text-[10px] font-bold text-white">
                      ✓
                    </span>
                  )}
                </div>
                <span className="max-w-[6.5rem] text-center text-xs font-medium leading-tight text-ink">
                  {m.nombre}
                </span>
              </>
            );

            // El propio Link/div lleva la posición absoluta (en vez de un
            // wrapper interno) para que tenga tamaño real y el foco de
            // teclado (:focus-visible, definido en globals.css) se dibuje
            // en el lugar correcto.
            const posicion = "absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5";
            const estilo = { left: `${x}%`, top: y };

            return m.disponible ? (
              <Link
                key={m.slug}
                href={`/dashboard/modulos/${m.slug}`}
                aria-label={`${m.nombre} — ${m.grupo}`}
                className={posicion}
                style={estilo}
              >
                {contenidoNodo}
              </Link>
            ) : (
              <div
                key={m.slug}
                aria-label={`${m.nombre} — próximamente`}
                className={posicion}
                style={estilo}
              >
                {contenidoNodo}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
