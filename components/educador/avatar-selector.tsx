"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { AvatarUsuario } from "@/components/avatar-usuario";
import { AVATARES, resolverAvatar } from "@/lib/perfil";

export function AvatarSelector({ value }: { value: string }) {
  const [seleccionadoActual, setSeleccionadoActual] = useState(resolverAvatar(value).id);

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-medium text-ink">Avatar</legend>
      <p className="text-xs text-ink-soft">
        Elige una identidad ficticia. No se permiten fotografías personales.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {AVATARES.map((avatar) => {
          const seleccionado = seleccionadoActual === avatar.id;
          return (
            <label
              key={avatar.id}
              className={`relative flex min-h-20 cursor-pointer items-center gap-2 rounded-xl border-2 p-2 text-xs font-semibold transition-colors focus-within:ring-2 focus-within:ring-primary ${
                seleccionado
                  ? "border-primary bg-primary-soft text-ink"
                  : "border-line bg-paper-raised text-ink-soft"
              }`}
            >
              <input
                type="radio"
                name="avatar_id"
                value={avatar.id}
                checked={seleccionado}
                onChange={() => setSeleccionadoActual(avatar.id)}
                aria-label={`Avatar ${avatar.id.replace("avatar_", "")} ${avatar.etiqueta}`}
                className="sr-only"
              />
              <AvatarUsuario avatarId={avatar.id} tamano={56} />
              <span className="min-w-0 break-words">{avatar.etiqueta}</span>
              {seleccionado && (
                <Check
                  className="absolute right-1 top-1 h-4 w-4 text-primary"
                  aria-hidden="true"
                />
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
