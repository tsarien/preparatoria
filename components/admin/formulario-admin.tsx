"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ESTADO_ADMIN_INICIAL,
  type EstadoAdmin,
} from "@/app/dashboard/admin/types";
import { cn } from "@/lib/utils";

type Accion = (prev: EstadoAdmin, formData: FormData) => Promise<EstadoAdmin>;

function Resultado({ estado }: { estado: EstadoAdmin }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <>
      {estado.error && (
        <p role="alert" className="text-sm text-alert">
          {estado.error}
        </p>
      )}
      {estado.mensaje && !estado.error && (
        <p role="status" className="break-words text-sm text-growth">
          {estado.mensaje}
        </p>
      )}
      {estado.codigo && (
        <div className="flex flex-col gap-2 rounded-xl border-2 border-gold bg-gold-soft p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Código de invitación · se muestra una sola vez
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code
              data-testid="codigo-invitacion"
              className="select-all break-all rounded-lg bg-paper-raised px-3 py-2 font-mono text-lg font-bold tracking-wider text-ink"
            >
              {estado.codigo}
            </code>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard?.writeText(estado.codigo!);
                setCopiado(true);
                setTimeout(() => setCopiado(false), 2000);
              }}
              className="press inline-flex min-h-10 items-center gap-1.5 rounded-lg border-2 border-line bg-paper-raised px-3 text-sm font-semibold text-ink hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {copiado ? (
                <Check className="h-4 w-4 text-growth" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
              {copiado ? "Copiado" : "Copiar"}
            </button>
          </div>
          <p className="text-xs text-ink-soft">
            Compártelo con {estado.codigoCorreo ?? "el educador"}. En la base de datos solo
            queda su hash: si lo pierdes, regenera la invitación.
          </p>
        </div>
      )}
    </>
  );
}

/** Formulario administrativo genérico: campos como hijos, acción de servidor, estado y reinicio al éxito. */
export function FormularioAdmin({
  accion,
  etiquetaEnvio,
  children,
  className,
  reiniciar = true,
}: {
  accion: Accion;
  etiquetaEnvio: string;
  children: React.ReactNode;
  className?: string;
  reiniciar?: boolean;
}) {
  const [estado, formAction, isPending] = useActionState(accion, ESTADO_ADMIN_INICIAL);
  const [clave, setClave] = useState(0);

  useEffect(() => {
    if (reiniciar && estado.mensaje && !estado.error) setClave((c) => c + 1);
  }, [estado, reiniciar]);

  return (
    <form action={formAction} className={cn("flex flex-col gap-3", className)}>
      <div key={clave} className="flex flex-col gap-3">
        {children}
      </div>
      <Resultado estado={estado} />
      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Guardando…" : etiquetaEnvio}
      </Button>
    </form>
  );
}

/** Botón de acción puntual (activar, revocar, eliminar…) con confirmación opcional. */
export function AccionAdmin({
  accion,
  campos,
  etiqueta,
  confirmar,
  peligro = false,
  className,
}: {
  accion: Accion;
  campos: Record<string, string>;
  etiqueta: string;
  /** Si se indica, pide confirmación antes de enviar (acciones destructivas). */
  confirmar?: string;
  peligro?: boolean;
  className?: string;
}) {
  const [estado, formAction, isPending] = useActionState(accion, ESTADO_ADMIN_INICIAL);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirmar && !window.confirm(confirmar)) e.preventDefault();
      }}
      className={cn("flex flex-col gap-1", className)}
    >
      {Object.entries(campos).map(([nombre, valor]) => (
        <input key={nombre} type="hidden" name={nombre} value={valor} />
      ))}
      <button
        type="submit"
        disabled={isPending}
        className={cn(
          "press min-h-9 rounded-lg border-2 px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 disabled:opacity-60",
          peligro
            ? "border-alert/50 text-alert hover:bg-alert-soft focus-visible:ring-alert"
            : "border-line text-ink hover:border-primary focus-visible:ring-primary",
        )}
      >
        {isPending ? "…" : etiqueta}
      </button>
      <Resultado estado={estado} />
    </form>
  );
}
