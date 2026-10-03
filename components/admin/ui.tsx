import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EncabezadoAdmin({
  etiqueta,
  titulo,
  descripcion,
  acciones,
}: {
  etiqueta: string;
  titulo: string;
  descripcion?: string;
  acciones?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-widest text-turquoise">{etiqueta}</p>
        <h1 className="break-words font-display text-2xl font-bold text-ink sm:text-3xl">{titulo}</h1>
        {descripcion && <p className="mt-1 max-w-2xl text-sm text-ink-soft">{descripcion}</p>}
      </div>
      {acciones && <div className="flex shrink-0 flex-wrap gap-2">{acciones}</div>}
    </header>
  );
}

export function TarjetaMetrica({
  Icono,
  etiqueta,
  valor,
  detalle,
  tono = "primary",
  href,
}: {
  Icono: LucideIcon;
  etiqueta: string;
  valor: number | string;
  detalle?: string;
  tono?: "primary" | "gold" | "turquoise" | "alert";
  href?: string;
}) {
  const colores = {
    primary: "border-primary/40 bg-primary-soft text-primary",
    gold: "border-gold/50 bg-gold-soft text-ink",
    turquoise: "border-turquoise/50 bg-turquoise-soft text-ink",
    alert: "border-alert/40 bg-alert-soft text-alert",
  }[tono];
  const contenido = (
    <div className="game-card flex h-full items-center gap-3 rounded-2xl bg-paper-raised p-4 transition-transform hover:-translate-y-0.5 motion-reduce:transition-none">
      <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-xl border-2", colores)}>
        <Icono className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="font-mono text-2xl font-bold leading-none text-ink">{valor}</p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">{etiqueta}</p>
        {detalle && <p className="text-xs text-ink-soft">{detalle}</p>}
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      {contenido}
    </Link>
  ) : (
    contenido
  );
}

const ESTILOS_INSIGNIA: Record<string, string> = {
  activo: "border-growth/50 bg-growth-soft text-ink",
  vigente: "border-growth/50 bg-growth-soft text-ink",
  inactivo: "border-line bg-paper text-ink-soft",
  archivado: "border-line bg-paper text-ink-soft",
  usada: "border-primary/40 bg-primary-soft text-primary",
  revocada: "border-alert/40 bg-alert-soft text-alert",
  vencida: "border-gold/60 bg-gold-soft text-ink",
  abierto: "border-gold/60 bg-gold-soft text-ink",
  en_proceso: "border-primary/50 bg-primary-soft text-primary",
  respondido: "border-turquoise/60 bg-turquoise-soft text-ink",
  cerrado: "border-line bg-paper text-ink-soft",
  baja: "border-line bg-paper text-ink-soft",
  media: "border-primary/40 bg-primary-soft text-primary",
  alta: "border-gold/60 bg-gold-soft text-ink",
  urgente: "border-alert/50 bg-alert-soft text-alert",
};

export function Insignia({ valor, etiqueta }: { valor: string; etiqueta?: string }) {
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        ESTILOS_INSIGNIA[valor] ?? "border-line bg-paper text-ink-soft",
      )}
    >
      {etiqueta ?? valor}
    </span>
  );
}

export function Paginacion({
  pagina,
  total,
  porPagina,
  hrefPara,
}: {
  pagina: number;
  total: number;
  porPagina: number;
  hrefPara: (pagina: number) => string;
}) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  if (paginas <= 1) return null;
  const enlace = "rounded-lg border-2 border-line px-3 py-1.5 text-sm font-semibold text-ink hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
  return (
    <nav aria-label="Paginación" className="flex items-center justify-between gap-3 text-sm text-ink-soft">
      <span>
        Página {pagina} de {paginas} · {total} resultados
      </span>
      <span className="flex gap-2">
        {pagina > 1 && (
          <Link href={hrefPara(pagina - 1)} className={enlace}>
            Anterior
          </Link>
        )}
        {pagina < paginas && (
          <Link href={hrefPara(pagina + 1)} className={enlace}>
            Siguiente
          </Link>
        )}
      </span>
    </nav>
  );
}

export function VacioAdmin({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-line bg-paper-raised p-6 text-center text-sm text-ink-soft">
      {children}
    </p>
  );
}

export const CLASE_CAMPO =
  "h-11 w-full rounded-xl border-2 border-line bg-paper px-3 text-base text-ink outline-none focus-visible:border-primary sm:text-sm";

export function Campo({
  etiqueta,
  children,
  ayuda,
}: {
  etiqueta: string;
  children: React.ReactNode;
  ayuda?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-ink">
      {etiqueta}
      {children}
      {ayuda && <span className="text-xs font-normal text-ink-soft">{ayuda}</span>}
    </label>
  );
}
