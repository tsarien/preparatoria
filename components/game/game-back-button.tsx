import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface GameBackButtonProps {
  href: string;
  label: string;
  className?: string;
}

/**
 * Botón "volver" consistente en todas las pantallas internas. Convierte un
 * link plano en un chip con hover que se siente como un botón del juego,
 * sin gritar ni competir con el contenido.
 */
export function GameBackButton({
  href,
  label,
  className,
}: GameBackButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex w-fit items-center gap-1.5 rounded-full border-2 border-transparent px-3 py-1.5 text-sm text-ink-soft transition-colors duration-150",
        "hover:border-line hover:bg-paper-raised hover:text-ink",
        "focus-visible:border-line focus-visible:bg-paper-raised",
        className,
      )}
    >
      <ArrowLeft
        className="h-4 w-4 transition-transform duration-150 group-hover:-translate-x-0.5 motion-reduce:transition-none"
        aria-hidden="true"
      />
      {label}
    </Link>
  );
}
