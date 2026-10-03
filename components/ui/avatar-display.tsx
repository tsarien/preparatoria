import { AVATARES, type AvatarId } from "@/lib/perfil";

export function AvatarDisplay({
  avatarId,
  className = "h-10 w-10",
}: {
  avatarId: string;
  className?: string;
}) {
  const avatar = AVATARES.find((item) => item.id === avatarId) ?? AVATARES[0];

  return (
    <span
      aria-hidden="true"
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full border-2 border-line ${className}`}
      style={{ backgroundColor: avatar.camisa }}
    >
      <span className="absolute bottom-[-0.4rem] h-[50%] w-[70%] rounded-t-full bg-paper-raised/50" />
      <span
        className="absolute top-[8%] h-[57%] w-[50%] rounded-[45%]"
        style={{ backgroundColor: avatar.piel }}
      />
      <span
        className={`absolute top-[6%] h-[28%] w-[50%] ${avatar.cabelloClase}`}
        style={{ backgroundColor: avatar.cabello }}
      />
      <span className="absolute left-[20%] top-[22%] h-[8%] w-[8%] rounded-full bg-ink" />
      <span className="absolute right-[20%] top-[22%] h-[8%] w-[8%] rounded-full bg-ink" />
      <span className="absolute top-[31%] h-[8%] w-[15%] rounded-b-full border-b-2 border-ink/70" />
    </span>
  );
}
