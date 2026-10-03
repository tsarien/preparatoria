"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { BotonCerrarSesion } from "@/components/boton-cerrar-sesion";
import { cn } from "@/lib/utils";

export interface ItemNavegacion {
  href: string;
  label: string;
  Icon: LucideIcon;
  /** Coincidencia exacta (true) o por prefijo (false, por defecto). */
  exacto?: boolean;
}

interface Props {
  /** aria-label de las <nav>. */
  etiqueta: string;
  /** Título corto junto al logo, p. ej. "Panel educativo". */
  titulo: string;
  /** Nombre de la persona autenticada. */
  nombre: string;
  items: readonly ItemNavegacion[];
}

function activo(pathname: string, item: ItemNavegacion) {
  return item.exacto ? pathname === item.href : pathname.startsWith(item.href);
}

/**
 * Cabecera + navegación de los paneles por rol (educador y administrador).
 *   · Barra superior en todas las pantallas: logo, título, nombre y "Cerrar sesión".
 *   · ≥lg: los enlaces van en la barra superior.
 *   · <lg: los enlaces van en una barra inferior fija (respeta safe-area-inset-bottom).
 */
export function NavegacionPanel({ etiqueta, titulo, nombre, items }: Props) {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-30 border-b-2 border-primary/25 bg-paper-raised/95 backdrop-blur supports-[backdrop-filter]:bg-paper-raised/85">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2 sm:px-4">
          <Link
            href="/dashboard"
            aria-label="preparatorIA"
            className="flex shrink-0 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Image
              src="/logo-icon.png"
              alt=""
              width={400}
              height={355}
              className="h-8 w-auto"
              priority
            />
          </Link>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate font-display text-sm font-semibold text-ink sm:text-base">
              {titulo}
            </p>
            <p className="truncate text-xs text-ink-soft">{nombre}</p>
          </div>

          <nav aria-label={etiqueta} className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {items.map((item) => {
                const esActivo = activo(pathname, item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={esActivo ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        esActivo
                          ? "bg-primary-soft text-primary"
                          : "text-ink-soft hover:bg-paper hover:text-ink",
                      )}
                    >
                      <item.Icon className="h-4 w-4" aria-hidden="true" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <BotonCerrarSesion etiquetaVisible />
        </div>
      </header>

      <nav
        aria-label={`${etiqueta} (móvil)`}
        className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-primary/25 bg-paper-raised lg:hidden"
      >
        <ul className="mx-auto flex max-w-lg items-stretch justify-between px-1 pb-[max(env(safe-area-inset-bottom),0.25rem)] pt-1.5">
          {items.map((item) => {
            const esActivo = activo(pathname, item);
            return (
              <li key={item.href} className="min-w-0 flex-1">
                <Link
                  href={item.href}
                  aria-current={esActivo ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-1 text-[9px] font-semibold leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
                    esActivo ? "text-primary" : "text-ink-soft",
                  )}
                >
                  <item.Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span className="text-center">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
