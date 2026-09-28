import Image from "next/image";
import { GameBackButton } from "@/components/game/game-back-button";
import { cn } from "@/lib/utils";

/** Ícono pixel art de cada módulo (los mismos que usa la portada del dashboard). */
export const ICONO_MODULO: Record<string, string> = {
  "presupuesto-personal": "/iconos/icono-presupuesto.png",
  "detectar-estafas": "/iconos/icono-seguridad.png",
  "contrato-arriendo": "/iconos/icono-contrato.png",
  "ahorro-metas": "/iconos/icono-ahorro.png",
};

interface EncabezadoPaginaProps {
  volverHref: string;
  volverEtiqueta: string;
  titulo: string;
  descripcion?: string | null;
  /** Ruta del ícono en /public (ej. ICONO_MODULO["ahorro-metas"]). */
  icono?: string;
  /** "grande" para listados y pantallas principales, "compacta" para un reto. */
  variante?: "grande" | "compacta";
}

/**
 * Encabezado común de las pantallas de dentro de la app (módulos, retos,
 * eventos, billetera, ranking, ajustes). El ícono va en una baldosa tintada
 * con el color de marca para que se lea igual en modo claro y oscuro.
 *
 * Es un Server Component a propósito: no necesita estado, solo pinta.
 */
export function EncabezadoPagina({
  volverHref,
  volverEtiqueta,
  titulo,
  descripcion,
  icono,
  variante = "grande",
}: EncabezadoPaginaProps) {
  const grande = variante === "grande";

  return (
    <header className="flex flex-col gap-4">
      <GameBackButton href={volverHref} label={volverEtiqueta} />

      <div className="flex items-center gap-4">
        {icono && (
          <div
            className={cn(
              "grid shrink-0 animate-pop place-items-center rounded-2xl border border-line bg-primary-soft",
              grande ? "h-20 w-20 sm:h-24 sm:w-24" : "h-14 w-14",
            )}
          >
            <Image
              src={icono}
              alt=""
              width={200}
              height={170}
              className="h-auto w-3/4 object-contain"
            />
          </div>
        )}
        <h1
          className={cn(
            "min-w-0 break-words font-display font-semibold text-ink",
            grande ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl",
          )}
        >
          {titulo}
        </h1>
      </div>

      {descripcion && <p className="text-ink-soft">{descripcion}</p>}
    </header>
  );
}
