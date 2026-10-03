"use client";

import { ChatGuiaPanel } from "@/components/game/chat-guia-panel";
import type { EstadoGuia } from "./types";

/** Versión a pantalla completa del chat (/dashboard/guia). Usa la misma interfaz que el cajón flotante. */
export function ChatGuia({
  estado,
  mensajesHoy,
}: {
  estado: EstadoGuia;
  mensajesHoy: number;
}) {
  return (
    <ChatGuiaPanel
      variante="pagina"
      estadoInicial={estado}
      mensajesHoy={mensajesHoy}
    />
  );
}
