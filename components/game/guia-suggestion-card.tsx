import Image from "next/image";
import { cn } from "@/lib/utils";

interface GuiaSuggestionCardProps {
  icono: string;
  titulo: string;
  prompt: string;
  onClick: (prompt: string) => void;
  disabled?: boolean;
}

/**
 * Card de sugerencia rápida. Al hacer clic, envía `prompt` como si el
 * estudiante lo hubiera escrito. Es un atajo, no un tema nuevo.
 */
export function GuiaSuggestionCard({
  icono,
  titulo,
  prompt,
  onClick,
  disabled,
}: GuiaSuggestionCardProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(prompt)}
      disabled={disabled}
      className={cn(
        "press game-card flex flex-col items-start gap-2 rounded-2xl border-2 border-primary/30 bg-paper-raised p-3 text-left transition-transform duration-150",
        "hover:-translate-y-0.5 motion-reduce:transition-none disabled:opacity-50",
      )}
    >
      <Image
        src={icono}
        alt=""
        width={200}
        height={160}
        className="h-9 w-auto"
      />
      <span className="font-display text-sm font-semibold text-ink">
        {titulo}
      </span>
      <span className="text-[11px] leading-tight text-ink-soft">{prompt}</span>
    </button>
  );
}
