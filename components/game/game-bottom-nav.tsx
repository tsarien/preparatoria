"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Swords, Bell, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Navegación inferior móvil. Solo se muestra en <lg. En desktop el HUD del
 * dashboard y los headers de página cumplen el rol de navegación.
 *
 * El item activo se resalta con morado + glow + indicador superior, para
 * comunicar claramente "estás aquí" sin depender solo del color.
 */
const ITEMS = [
  {
    href: "/dashboard",
    label: "Inicio",
    Icon: Home,
    match: (p: string) => p === "/dashboard",
  },
  {
    href: "/dashboard/modulos",
    label: "Retos",
    Icon: Swords,
    match: (p: string) => p.startsWith("/dashboard/modulos"),
  },
  {
    href: "/dashboard/eventos",
    label: "Eventos",
    Icon: Bell,
    match: (p: string) => p.startsWith("/dashboard/eventos"),
  },
  {
    href: "/dashboard/guia",
    label: "IA",
    Icon: Sparkles,
    match: (p: string) => p.startsWith("/dashboard/guia"),
  },
  {
    // TODO: crear /dashboard/perfil cuando exista. Por ahora Ajustes cumple.
    href: "/dashboard/ajustes",
    label: "Perfil",
    Icon: User,
    match: (p: string) => p.startsWith("/dashboard/ajustes"),
  },
] as const;

export function GameBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
    >
      <div className="border-t-2 border-primary/25 bg-paper-raised/95 backdrop-blur-lg supports-[backdrop-filter]:bg-paper-raised/80">
        <ul className="mx-auto flex max-w-lg items-stretch justify-between px-2 pb-[max(env(safe-area-inset-bottom),0.25rem)] pt-1.5">
          {ITEMS.map(({ href, label, Icon, match }) => {
            const activo = match(pathname);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={activo ? "page" : undefined}
                  className={cn(
                    "press relative flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                    activo ? "text-primary" : "text-ink-soft hover:text-ink",
                  )}
                >
                  {/* Indicador superior del activo — refuerza "estás aquí" */}
                  {activo && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-1.5 h-0.5 w-8 rounded-full bg-primary shadow-[0_0_8px_rgba(108,77,255,0.7)]"
                    />
                  )}
                  <span
                    className={cn(
                      "grid h-8 w-8 place-items-center rounded-lg transition-all duration-150",
                      activo &&
                        "bg-primary-soft shadow-[0_0_10px_rgba(108,77,255,0.4)]",
                    )}
                  >
                    <Icon
                      className="h-5 w-5"
                      strokeWidth={activo ? 2.5 : 2}
                      aria-hidden="true"
                    />
                  </span>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
