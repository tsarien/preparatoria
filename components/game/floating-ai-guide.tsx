"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChatGuiaPanel } from "@/components/game/chat-guia-panel";
import { cn } from "@/lib/utils";

/**
 * Botón flotante de la IA Guía + chat. Ya NO navega a otra página: abre el chat en un cajón
 * (panel lateral en escritorio, hoja inferior casi a pantalla completa en móvil) desde cualquier
 * pantalla del dashboard. El chat se mantiene montado al cerrar, así que la conversación no se
 * pierde al cerrarlo y volver a abrirlo; el historial completo vive en Supabase.
 *
 * Posiciones: IA Guía abajo a la DERECHA; "¿Necesitas ayuda?" abajo a la IZQUIERDA
 * (components/soporte/boton-ayuda.tsx). Ambos respetan safe-area-inset-bottom y quedan por
 * encima de la navegación inferior móvil.
 */
export function FloatingAIGuide() {
  const [abierto, setAbierto] = useState(false);
  const [montado, setMontado] = useState(false);
  const botonRef = useRef<HTMLButtonElement>(null);
  const primeraAperturaHecha = useRef(false);

  useEffect(() => {
    if (!abierto) return;
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [abierto]);

  // Devuelve el foco al botón al cerrar (accesibilidad de teclado).
  useEffect(() => {
    if (!abierto && primeraAperturaHecha.current) botonRef.current?.focus();
    if (abierto) primeraAperturaHecha.current = true;
  }, [abierto]);

  function alternar() {
    setMontado(true);
    setAbierto((a) => !a);
  }

  return (
    <>
      <button
        ref={botonRef}
        type="button"
        onClick={alternar}
        aria-label={abierto ? "Cerrar IA Guía" : "Abrir IA Guía"}
        aria-expanded={abierto}
        aria-haspopup="dialog"
        title="IA Guía"
        className={cn(
          "group fixed bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] right-4 z-50 grid h-18 w-18 place-items-center rounded-full border-[3px] border-turquoise bg-paper-raised shadow-[0_4px_0_rgba(0,217,204,0.45),0_8px_20px_rgba(31,36,48,0.22)] transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-turquoise/50 motion-reduce:transition-none lg:bottom-6 lg:right-6",
          abierto && "max-lg:hidden",
        )}
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
          className="pointer-events-none absolute right-[calc(100%+0.5rem)] top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded-md border border-turquoise bg-paper-raised px-2 py-1 text-xs font-bold text-ink opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 lg:block"
        >
          IA Guía
        </span>
      </button>

      {montado && (
        <>
          {/* Fondo: solo móvil; al tocarlo se cierra el chat. */}
          <div
            aria-hidden="true"
            onClick={() => setAbierto(false)}
            className={cn(
              "fixed inset-0 z-[65] bg-ink/45 lg:hidden",
              !abierto && "hidden",
            )}
          />
          <div
            role="dialog"
            aria-label="Chat de la IA Guía"
            hidden={!abierto}
            className={cn(
              "fixed inset-x-0 bottom-0 z-[70] flex h-[min(88dvh,40rem)] flex-col overflow-hidden rounded-t-3xl border-[3px] border-b-0 border-turquoise bg-paper-raised pb-[env(safe-area-inset-bottom)] shadow-2xl",
              "lg:inset-x-auto lg:bottom-6 lg:right-6 lg:h-[min(40rem,calc(100dvh-3rem))] lg:w-[26rem] lg:rounded-3xl lg:border-b-[3px] lg:pb-0",
              !abierto && "hidden",
            )}
          >
            <ChatGuiaPanel
              variante="flotante"
              abierto={abierto}
              autoFoco
              onCerrar={() => setAbierto(false)}
            />
          </div>
        </>
      )}
    </>
  );
}
