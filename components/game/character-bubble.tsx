import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CharacterBubbleProps {
  /** Nombre a mostrar sobre el avatar (el estudiante se ve como "Tú"). */
  nombre: string;
  /** Inicial para el avatar. Si no se pasa, la primera letra del nombre. */
  inicial?: string;
  /** Quién habla — define color de la burbuja y del avatar. */
  tono: "yo" | "arrendador" | "estafador" | "guia";
  /** Ruta a un PNG en /public. Si viene, reemplaza el avatar-inicial. */
  avatarSrc?: string;
  children: ReactNode;
}

const TONOS = {
  yo: {
    bubble: "bg-ink text-paper rounded-br-md",
    avatar: "border-ink/30 bg-ink text-paper",
    row: "justify-end",
  },
  arrendador: {
    bubble: "border-2 border-primary/30 bg-primary-soft text-ink rounded-bl-md",
    avatar: "border-primary/50 bg-primary text-white",
    row: "justify-start",
  },
  estafador: {
    bubble: "border-2 border-alert/30 bg-alert-soft text-ink rounded-bl-md",
    avatar: "border-alert/50 bg-alert text-white",
    row: "justify-start",
  },
  guia: {
    bubble:
      "border-2 border-turquoise/50 bg-turquoise-soft text-ink rounded-bl-md",
    avatar: "border-turquoise/60 bg-turquoise-soft",
    row: "justify-start",
  },
};

/**
 * Burbuja de diálogo con avatar de personaje. Se usa en las simulaciones
 * conversacionales (arrendador, estafador, guía). Si no hay `avatarSrc`,
 * muestra un círculo con la inicial del nombre.
 */
export function CharacterBubble({
  nombre,
  inicial,
  tono,
  avatarSrc,
  children,
}: CharacterBubbleProps) {
  const t = TONOS[tono];
  const letra = (inicial ?? nombre.trim().charAt(0) ?? "?").toUpperCase();

  const avatar = (
    <span
      aria-hidden="true"
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border-2 font-display text-sm font-bold shadow-[0_2px_0_rgba(31,36,48,0.15)]",
        t.avatar,
      )}
    >
      {avatarSrc ? (
        <Image
          src={avatarSrc}
          alt=""
          width={64}
          height={64}
          className="h-7 w-7 object-contain"
        />
      ) : (
        letra
      )}
    </span>
  );

  return (
    <div className={cn("flex max-w-full items-end gap-2", t.row)}>
      {tono !== "yo" && avatar}
      <div
        className={cn(
          "flex max-w-[calc(100%-3rem)] flex-col gap-0.5 sm:max-w-[75%]",
          tono === "yo" && "items-end",
        )}
      >
        <span className="px-1 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
          {nombre}
        </span>
        <div
          className={cn(
            "animate-fade-up break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
            t.bubble,
          )}
        >
          {children}
        </div>
      </div>
      {tono === "yo" && avatar}
    </div>
  );
}
