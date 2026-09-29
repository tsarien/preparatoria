import Image from "next/image";
import Link from "next/link";

export function FloatingAIGuide() {
  return (
    <Link
      href="/dashboard/guia"
      aria-label="IA Guía"
      title="IA Guía"
      className="group fixed bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] right-4 z-50 grid h-18 w-18 place-items-center rounded-full border-[3px] border-turquoise bg-paper-raised shadow-[0_4px_0_rgba(0,217,204,0.45),0_8px_20px_rgba(31,36,48,0.22)] transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-turquoise/50 lg:bottom-6 lg:right-6"
    >
      <Image
        src="/mascota/mascota-neutral.png"
        alt=""
        width={58}
        height={58}
        className="h-[3.65rem] w-[3.65rem] object-contain"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-[calc(100%+0.5rem)] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border border-turquoise bg-paper-raised px-2 py-1 text-xs font-bold text-ink opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        IA Guía
      </span>
    </Link>
  );
}
