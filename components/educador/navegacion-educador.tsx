"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Home, Sparkles, UserRound, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard/educador", label: "Inicio", Icon: Home },
  {
    href: "/dashboard/educador/estudiantes",
    label: "Estudiantes",
    Icon: Users,
  },
  { href: "/dashboard/educador/reportes", label: "Reportes", Icon: FileText },
  { href: "/dashboard/educador/ia", label: "IA educativa", Icon: Sparkles },
  { href: "/dashboard/ajustes", label: "Perfil", Icon: UserRound },
] as const;

function enlaceActivo(pathname: string, href: string): boolean {
  return href === "/dashboard/educador"
    ? pathname === href
    : pathname.startsWith(href);
}

export function NavegacionEducador() {
  const pathname = usePathname();

  return (
    <>
      <nav
        aria-label="Navegación educativa"
        className="hidden border-b-2 border-primary/25 bg-paper-raised px-4 py-3 lg:block"
      >
        <ul className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">
          {ITEMS.map(({ href, label, Icon }) => {
            const activo = enlaceActivo(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={activo ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    activo
                      ? "bg-primary-soft text-primary"
                      : "text-ink-soft hover:bg-paper hover:text-ink",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <nav
        aria-label="Navegación educativa"
        className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-primary/25 bg-paper-raised lg:hidden"
      >
        <ul className="mx-auto flex max-w-lg items-stretch justify-between px-1 pb-[max(env(safe-area-inset-bottom),0.25rem)] pt-1.5">
          {ITEMS.map(({ href, label, Icon }) => {
            const activo = enlaceActivo(pathname, href);
            return (
              <li key={href} className="min-w-0 flex-1">
                <Link
                  href={href}
                  aria-current={activo ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-1 text-[9px] font-semibold leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
                    activo ? "text-primary" : "text-ink-soft",
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span className="text-center">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
