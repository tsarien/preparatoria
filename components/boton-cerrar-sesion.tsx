"use client";

import { LogOut } from "lucide-react";
import { useFormStatus } from "react-dom";
import { cerrarSesion } from "@/app/dashboard/actions";
import { cn } from "@/lib/utils";

function Contenido({
  etiquetaVisible,
  className,
}: {
  etiquetaVisible: boolean;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="Cerrar sesión"
      title="Cerrar sesión"
      className={cn(
        "game-chip press flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-alert/40 bg-paper-raised text-sm font-medium text-ink transition-transform duration-150 hover:-translate-y-0.5 hover:border-alert hover:bg-alert-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alert disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none",
        etiquetaVisible ? "px-3" : "w-10",
        className,
      )}
    >
      <LogOut className="h-4 w-4 text-alert" aria-hidden="true" />
      {etiquetaVisible && (
        <span className="hidden sm:inline">{pending ? "Saliendo…" : "Salir"}</span>
      )}
    </button>
  );
}

/** Cierra la sesión con Supabase Auth (acción de servidor `cerrarSesion`). Un solo botón por banner. */
export function BotonCerrarSesion({
  etiquetaVisible = false,
  className,
}: {
  etiquetaVisible?: boolean;
  className?: string;
}) {
  return (
    <form action={cerrarSesion} className="shrink-0">
      <Contenido etiquetaVisible={etiquetaVisible} className={className} />
    </form>
  );
}
