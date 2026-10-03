import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GameModuleShellProps {
  children: ReactNode;
  ancho?: "compacto" | "estandar" | "amplio";
  className?: string;
}

/**
 * Envoltorio de página de módulo. Provee:
 *  - Halo radial morado detrás del encabezado (jerarquía visual)
 *  - Patrón pixel-dot sutil (identidad "mundo")
 *  - Padding y ancho consistente, incluyendo 320px sin overflow
 *
 * Es un <main> completo — reemplaza al actual.
 */
export function GameModuleShell({
  children,
  ancho = "estandar",
  className,
}: GameModuleShellProps) {
  return (
    <main
      className={cn(
        "relative mx-auto flex min-h-screen flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10",
        ancho === "estandar" && "max-w-2xl",
        ancho === "compacto" && "max-w-lg",
        ancho === "amplio" && "max-w-6xl",
        className,
      )}
    >
      {/* Halo radial superior — refuerza la cabecera y da profundidad */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--color-primary)_18%,transparent),transparent_70%)]"
      />
      {/* Patrón pixel-dot sutil en toda la página */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_1px_1px,color-mix(in_srgb,var(--color-primary)_12%,transparent)_1px,transparent_0)] bg-[length:22px_22px] opacity-40"
      />
      {children}
    </main>
  );
}
