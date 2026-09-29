"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  cambiarContrasena,
  type CambiarContrasenaState,
} from "@/app/dashboard/ajustes/actions";

const ESTADO_VACIO: CambiarContrasenaState = {};

export function PasswordForm() {
  const [state, formAction, isPending] = useActionState(
    cambiarContrasena,
    ESTADO_VACIO,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        Nueva contraseña
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="h-11 rounded-lg border border-line bg-paper-raised px-3"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        Confirmar contraseña
        <input
          name="confirmacion"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="h-11 rounded-lg border border-line bg-paper-raised px-3"
        />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-alert">
          {state.error}
        </p>
      )}
      {state.mensaje && (
        <p role="status" className="text-sm text-growth">
          {state.mensaje}
        </p>
      )}
      <Button
        type="submit"
        disabled={isPending}
        variant="outline"
        className="self-start"
      >
        {isPending ? "Actualizando…" : "Cambiar contraseña"}
      </Button>
    </form>
  );
}
