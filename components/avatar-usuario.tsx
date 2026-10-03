import Image from "next/image";
import {
  AVATARES_CON_IMAGEN,
  resolverAvatar,
  rutaImagenAvatar,
} from "@/lib/perfil";
import { cn } from "@/lib/utils";

interface Props {
  /** avatar_id guardado en perfiles.avatar_id (cualquier valor inválido usa avatar_01). */
  avatarId: string | null | undefined;
  /** Lado del círculo en px. Por defecto 40. */
  tamano?: number;
  className?: string;
  /** Texto accesible; si se omite el avatar es decorativo. */
  etiqueta?: string;
}

/**
 * Avatar del usuario. Un único componente para HUD, ranking, ajustes y selector.
 * Dibujado con CSS por ahora; cuando AVATARES_CON_IMAGEN sea true usa public/avatares/*.png
 * (especificaciones de las imágenes en lib/perfil.ts). Las proporciones internas están en em,
 * así que escala con `tamano` sin más cambios.
 */
export function AvatarUsuario({ avatarId, tamano = 40, className, etiqueta }: Props) {
  const avatar = resolverAvatar(avatarId);
  const comunes = {
    width: tamano,
    height: tamano,
    fontSize: `${tamano / 56}rem`, // 1rem ≙ 56 px (tamaño de referencia del dibujo)
  };

  if (AVATARES_CON_IMAGEN) {
    return (
      <span
        className={cn(
          "relative inline-block shrink-0 overflow-hidden rounded-full border-2 border-line",
          className,
        )}
        style={{ width: tamano, height: tamano, backgroundColor: avatar.camisa }}
        role={etiqueta ? "img" : undefined}
        aria-label={etiqueta}
        aria-hidden={etiqueta ? undefined : true}
      >
        <Image
          src={rutaImagenAvatar(avatar.id)}
          alt=""
          width={tamano * 2}
          height={tamano * 2}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      role={etiqueta ? "img" : undefined}
      aria-label={etiqueta}
      aria-hidden={etiqueta ? undefined : true}
      data-avatar-id={avatar.id}
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full border-2 border-line",
        className,
      )}
      style={{ ...comunes, backgroundColor: avatar.camisa }}
    >
      <span className="absolute bottom-[-0.4em] h-[1.75em] w-[2.5em] rounded-t-full bg-paper-raised/50" />
      <span
        className="absolute top-[0.48em] h-[2em] w-[1.75em] rounded-[45%]"
        style={{ backgroundColor: avatar.piel }}
      />
      <span
        className={`absolute top-[0.34em] h-[1em] w-[1.75em] ${avatar.cabelloClase}`}
        style={{ backgroundColor: avatar.cabello }}
      />
      <span className="absolute left-[1.18em] top-[1.22em] h-[0.25em] w-[0.25em] rounded-full bg-ink" />
      <span className="absolute right-[1.18em] top-[1.22em] h-[0.25em] w-[0.25em] rounded-full bg-ink" />
      <span className="absolute top-[1.75em] h-[0.25em] w-[0.5em] rounded-b-full border-b border-ink/70" />
    </span>
  );
}
