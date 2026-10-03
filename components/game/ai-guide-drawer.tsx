"use client";

import { useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { ChatGuia } from "@/app/dashboard/guia/chat-guia";

export function AIGuideDrawer({
  historial,
  mensajesHoy,
}: {
  historial: any[];
  mensajesHoy: number;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        aria-label="IA Guía"
        title="IA Guía"
        className="group fixed bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] right-4 z-40 grid h-18 w-18 place-items-center rounded-full border-[3px] border-turquoise bg-paper-raised shadow-[0_4px_0_rgba(0,217,204,0.45),0_8px_20px_rgba(31,36,48,0.22)] transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-turquoise/50 lg:bottom-6 lg:right-6"
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
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-paper shadow-2xl transition-transform duration-300 ease-out sm:rounded-l-2xl ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-line px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border-2 border-primary/50 bg-primary-soft shadow-[0_3px_0_rgba(108,77,255,0.3)]">
              <Image
                src="/mascota/mascota-neutral.png"
                alt=""
                width={320}
                height={315}
                className="h-8 w-auto animate-pop"
              />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-ink">
                IA Guía
              </h2>
              <p className="text-xs text-ink-soft">
                Compañero de decisiones
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="grid h-10 w-10 place-items-center rounded-full text-ink-soft transition-colors hover:bg-paper-raised hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Cerrar IA Guía"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <ChatGuia historialInicial={historial} mensajesHoy={mensajesHoy} />
        </div>
      </div>
    </>
  );
}
