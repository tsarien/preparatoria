"use client";

import {
  FileText,
  Gamepad2,
  Home,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import {
  NavegacionPanel,
  type ItemNavegacion,
} from "@/components/navegacion-panel";

// "Juego" lleva al mapa en modo demostración (/dashboard): el educador explora módulos y retos
// con un personaje de práctica que NO cuenta en ranking, reportes ni estadísticas de estudiantes.
const ITEMS: readonly ItemNavegacion[] = [
  { href: "/dashboard/educador", label: "Inicio", Icon: Home, exacto: true },
  { href: "/dashboard/educador/estudiantes", label: "Estudiantes", Icon: Users },
  { href: "/dashboard/educador/reportes", label: "Reportes", Icon: FileText },
  { href: "/dashboard/educador/ia", label: "IA educativa", Icon: Sparkles },
  { href: "/dashboard", label: "Juego", Icon: Gamepad2, exacto: true },
  { href: "/dashboard/ajustes", label: "Perfil", Icon: UserRound },
];

export function NavegacionEducador({ nombre }: { nombre: string }) {
  return (
    <NavegacionPanel
      etiqueta="Navegación educativa"
      titulo="Panel educativo"
      nombre={nombre}
      items={ITEMS}
    />
  );
}
