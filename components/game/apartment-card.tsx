import { Home, Bed, Bath, MapPin, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ApartmentCardProps {
  canon: number;
  ciudad: string;
  habitaciones: number;
  banos: number;
  serviciosIncluidos: boolean;
  className?: string;
}

/**
 * Composición visual del apartamento — el "brief" narrativo del caso.
 *
 * TODOS los datos que recibe son DECORATIVOS: no vienen de la base de datos,
 * los declara la página como constantes narrativas del módulo. No participan
 * en ninguna validación ni cálculo.
 *
 * NOTA DE ASSET: hoy usa el icono `Home` de Lucide en un medallón pixel-art
 * como marcador visual. Pendiente: ilustración pixel-art del apartamento
 * (ver "ASSETS NECESARIOS" al pie).
 */
export function ApartmentCard({
  canon,
  ciudad,
  habitaciones,
  banos,
  serviciosIncluidos,
  className,
}: ApartmentCardProps) {
  return (
    <div
      className={cn(
        "game-card relative overflow-hidden rounded-2xl bg-paper-raised",
        className,
      )}
    >
      {/* Cabecera con "foto" (medallón pixel-art por ahora) */}
      <div className="relative flex items-center gap-4 border-b-2 border-line bg-gradient-to-br from-primary-soft via-paper-raised to-gold-soft p-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border-2 border-primary/40 bg-paper-raised shadow-[0_3px_0_rgba(108,77,255,0.25)] sm:h-20 sm:w-20">
          <Home
            className="h-8 w-8 text-primary sm:h-10 sm:w-10"
            aria-hidden="true"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
            Encontraste un apartamento
          </p>
          <h3 className="break-words font-display text-lg font-semibold leading-tight text-ink sm:text-xl">
            Apartamento en arriendo
          </h3>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-soft">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {ciudad}
          </p>
        </div>
      </div>

      {/* Cifra principal */}
      <div className="flex items-baseline justify-between gap-3 px-4 py-3.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
          Canon mensual
        </span>
        <span className="font-mono text-2xl font-semibold text-ink">
          ${canon.toLocaleString("es-CO")}
        </span>
      </div>

      {/* Ficha rápida */}
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t-2 border-line px-4 py-3 text-xs text-ink-soft">
        <li className="inline-flex items-center gap-1.5">
          <Bed className="h-3.5 w-3.5" aria-hidden="true" />
          {habitaciones} {habitaciones === 1 ? "habitación" : "habitaciones"}
        </li>
        <li className="inline-flex items-center gap-1.5">
          <Bath className="h-3.5 w-3.5" aria-hidden="true" />
          {banos} {banos === 1 ? "baño" : "baños"}
        </li>
        <li className="inline-flex items-center gap-1.5">
          {serviciosIncluidos ? (
            <>
              <Wifi className="h-3.5 w-3.5 text-growth" aria-hidden="true" />
              Servicios incluidos
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
              Servicios no incluidos
            </>
          )}
        </li>
      </ul>
    </div>
  );
}
