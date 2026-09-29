"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { AVATARES, type AvatarId } from "@/lib/perfil";

function AvatarIlustrado({
  avatarId,
  etiqueta,
}: {
  avatarId: AvatarId;
  etiqueta: string;
}) {
  const avatar = AVATARES.find((item) => item.id === avatarId)!;

  return (
    <span
      aria-hidden="true"
      className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-line"
      style={{ backgroundColor: avatar.camisa }}
    >
      <span className="absolute bottom-[-0.4rem] h-7 w-10 rounded-t-full bg-paper-raised/50" />
      <span
        className="absolute top-[0.48rem] h-8 w-7 rounded-[45%]"
        style={{ backgroundColor: avatar.piel }}
      />
      <span
        className={`absolute top-[0.34rem] h-4 w-7 ${avatar.cabelloClase}`}
        style={{ backgroundColor: avatar.cabello }}
      />
      <span className="absolute left-[1.18rem] top-[1.22rem] h-1 w-1 rounded-full bg-ink" />
      <span className="absolute right-[1.18rem] top-[1.22rem] h-1 w-1 rounded-full bg-ink" />
      <span className="absolute top-[1.75rem] h-1 w-2 rounded-b-full border-b border-ink/70" />
      <span className="sr-only">{etiqueta}</span>
    </span>
  );
}

export function AvatarSelector({ value }: { value: string }) {
  const [seleccionadoActual, setSeleccionadoActual] = useState(value);

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
              <AvatarIlustrado
                avatarId={avatar.id}
                etiqueta={avatar.etiqueta}
              />
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
