import Link from "next/link";
import Image from "next/image";
import { Check, Lock, Sparkles } from "lucide-react";
import { momentoActualColombia, type MomentoDia } from "@/lib/paisaje";
import { cn } from "@/lib/utils";

export interface ModuloCamino {
  slug: string;
  grupo: string;
  nombre: string;
  icono: string;
  disponible: boolean;
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

// Posiciones horizontales (% del ancho) — serpentina por ciclos de 2.
const OFFSETS_X = [24, 70];
const ALTO_TRAMO = 176; // espacio vertical entre centros de nodo
const MARGEN_INFERIOR = 130;

export function CaminoModulos({
  modulos,
  moduloActivoSlug,
}: CaminoModulosProps) {
  const activoSlug =
    moduloActivoSlug ??
    modulos.find((m) => m.estado !== "completado")?.slug ??
    modulos[0]?.slug;

  const alturaCamino =
    ALTO_TRAMO * Math.max(modulos.length - 1, 0) + MARGEN_INFERIOR;

  const puntos = modulos.map((_, i) => ({
    x: OFFSETS_X[i % OFFSETS_X.length],
    y: i * ALTO_TRAMO + 60,
  }));

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
  const completados = modulos.filter((m) => m.estado === "completado").length;

  return (
    <section
      aria-label="Mapa de misiones"
      className="game-card relative overflow-hidden rounded-3xl"
    >
      {/* Fondo: paisaje horario. TODO renovación: reemplazar por
          /mundo/mundo-colombia.png cuando llegue el asset. */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${imagenFondo})` }}
        aria-hidden="true"
      />
      {/* Velo tintado con el token de tema: en claro se aclara, en oscuro se
          oscurece — nunca un negro fijo que aplaste el paisaje en modo claro. */}
      <div
        className="absolute inset-0 bg-paper/45 dark:bg-paper/60"
        aria-hidden="true"
      />
      {/* Viñeta inferior para legibilidad de las etiquetas más bajas */}
      <div
        className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-paper/85 to-transparent"
        aria-hidden="true"
      />

      <div className="relative px-4 pb-8 pt-6 sm:px-6 sm:pb-10 sm:pt-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-ink drop-shadow-sm sm:text-2xl">
            Tu mapa de aventura
          </h2>
          <span className="hidden rounded-full border-2 border-gold/60 bg-gold-soft/95 px-3 py-1 font-mono text-xs font-semibold text-ink backdrop-blur-sm sm:inline-flex">
            {completados} / {modulos.length} misiones
          </span>
        </div>

        <div className="relative" style={{ height: alturaCamino }}>
          {/* Camino en 3 capas: sombra + base dorada + guiones claros */}
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox={`0 0 100 ${alturaCamino}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d={trazo}
              fill="none"
              stroke="rgba(31, 36, 48, 0.4)"
              strokeWidth={9}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              transform="translate(0, 4)"
            />
            <path
              d={trazo}
              fill="none"
              stroke="#ffb020"
              strokeWidth={7}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={trazo}
              fill="none"
              stroke="#fff3de"
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray="3 10"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {modulos.map((m, i) => (
            <NodoMision
              key={m.slug}
              modulo={m}
              x={puntos[i].x}
              y={puntos[i].y}
              activo={m.slug === activoSlug}
              completado={m.estado === "completado"}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function NodoMision({
  modulo,
  x,
  y,
  activo,
  completado,
}: {
  modulo: ModuloCamino;
  x: number;
  y: number;
  activo: boolean;
  completado: boolean;
}) {
  const contenido = (
    <div className="relative flex flex-col items-center gap-2.5">
      {/* Mascota señalando — SOLO en el nodo activo.
          TODO renovación: cambiar a /mascota/mascota-senalando.png cuando llegue. */}
      {activo && (
        <Image
          src="/mascota/mascota-neutral.png"
          alt=""
          width={160}
          height={160}
          className="pointer-events-none absolute -top-[3.75rem] left-1/2 h-12 w-auto -translate-x-1/2 drop-shadow-lg sm:h-14"
        />
      )}

      {/* Medallón */}
      <div
        className={cn(
          "relative grid h-20 w-20 place-items-center rounded-full border-[3px] transition-transform duration-200 sm:h-24 sm:w-24",
          "shadow-[0_4px_0_rgba(31,36,48,0.25)]",
          completado && "border-growth bg-growth-soft",
          activo && !completado && "border-gold bg-gold-soft pulse-mission",
          !completado && !activo && "border-primary/30 bg-paper-raised/95",
        )}
      >
        <Image
          src={modulo.icono}
          alt=""
          width={200}
          height={160}
          className="h-10 w-auto sm:h-12"
        />

        {/* Sello de completado */}
        {completado && (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full border-2 border-paper-raised bg-growth text-white"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
        )}

        {/* Candado para módulos no disponibles (roadmap) */}
        {!completado && !modulo.disponible && (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full border-2 border-paper-raised bg-ink-soft text-white"
          >
            <Lock className="h-3 w-3" />
          </span>
        )}

        {/* Destello del activo */}
        {activo && !completado && (
          <span
            aria-hidden="true"
            className="absolute -left-2 -top-2 grid h-7 w-7 place-items-center rounded-full border-2 border-paper-raised bg-gold"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#1f2430]" />
          </span>
        )}
      </div>

      {/* Etiqueta tipo "cartel de misión" */}
      <span
        className={cn(
          "max-w-[8rem] rounded-xl border-2 px-2.5 py-1 text-center text-xs font-semibold leading-tight",
          "shadow-[0_3px_0_rgba(31,36,48,0.2)]",
          completado && "border-growth/60 bg-growth-soft text-ink",
          activo && !completado && "border-gold bg-gold-soft text-ink",
          !completado &&
            !activo &&
            "border-primary/30 bg-paper-raised/95 text-ink-soft",
        )}
      >
        {modulo.nombre}
      </span>
    </div>
  );

  const posicion =
    "absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-transform duration-200 motion-reduce:transition-none";
  const estilo = { left: `${x}%`, top: y };

  return modulo.disponible ? (
    <Link
      href={`/dashboard/modulos/${modulo.slug}`}
      aria-label={`${modulo.nombre} — ${modulo.grupo}`}
      className={cn(posicion, "hover:-translate-y-[calc(50%+4px)]")}
      style={estilo}
    >
      {contenido}
    </Link>
  ) : (
    <div
      aria-label={`${modulo.nombre} — próximamente`}
      className={posicion}
      style={estilo}
    >
      {contenido}
    </div>
  );
}
