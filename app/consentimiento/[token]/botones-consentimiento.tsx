"use client";

import { useState, useTransition } from "react";
import { resolverConsentimientoAction } from "./actions";
import { Button } from "@/components/ui/button";

export function BotonesConsentimiento({ token }: { token: string }) {
  const [resultado, setResultado] = useState<"aprobado" | "rechazado" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function decidir(aprobar: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await resolverConsentimientoAction(token, aprobar);
      if (res.resultado) {
        setResultado(res.resultado);
      } else {
        setError(res.error ?? "Algo salió mal.");
      }
    });
  }

  if (resultado === "aprobado") {
    return <p className="text-sm font-medium text-growth">Autorizaste la cuenta. Ya puede usar la app sin restricciones.</p>;
  }
  if (resultado === "rechazado") {
    return <p className="text-sm font-medium text-alert">Rechazaste la solicitud. La cuenta queda sin autorizar.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Button type="button" onClick={() => decidir(true)} disabled={isPending}>
          {isPending ? "…" : "Autorizar"}
        </Button>
        <Button type="button" variant="outline" onClick={() => decidir(false)} disabled={isPending}>
          Rechazar
        </Button>
      </div>
      {error && (
        <p className="text-sm text-alert" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
