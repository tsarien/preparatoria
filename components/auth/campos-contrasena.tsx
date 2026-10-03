"use client";

import { useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";
import { CampoConIcono } from "@/components/ui/campo-con-icono";
import { LONGITUD_MINIMA_PASSWORD } from "@/lib/registro";

/**
 * Contraseña + "Confirma tu contraseña". La coincidencia se valida aquí por UX
 * (setCustomValidity bloquea el envío con un mensaje claro); el servidor la vuelve a
 * validar y el campo de confirmación NUNCA se envía a Supabase Auth.
 */
export function CamposContrasena() {
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const confirmacionRef = useRef<HTMLInputElement>(null);

  const noCoinciden = confirmacion.length > 0 && password !== confirmacion;

  useEffect(() => {
    confirmacionRef.current?.setCustomValidity(
      noCoinciden ? "Las contraseñas no coinciden." : "",
    );
  }, [noCoinciden]);

  return (
    <>
      <CampoConIcono
        icon={Lock}
        label="Contraseña"
        name="password"
        type="password"
        required
        minLength={LONGITUD_MINIMA_PASSWORD}
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        hint={`Mínimo ${LONGITUD_MINIMA_PASSWORD} caracteres.`}
      />
      <div className="flex flex-col gap-1.5">
        <CampoConIcono
          icon={Lock}
          label="Confirma tu contraseña"
          name="confirmar_password"
          type="password"
          required
          minLength={LONGITUD_MINIMA_PASSWORD}
          autoComplete="new-password"
          ref={confirmacionRef}
          value={confirmacion}
          onChange={(e) => setConfirmacion(e.target.value)}
          aria-invalid={noCoinciden}
          aria-describedby={noCoinciden ? "confirmar-password-error" : undefined}
        />
        {noCoinciden && (
          <p
            id="confirmar-password-error"
            className="text-xs text-alert"
            role="alert"
          >
            Las contraseñas no coinciden.
          </p>
        )}
      </div>
    </>
  );
}
