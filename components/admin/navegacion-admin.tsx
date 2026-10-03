"use client";

import {
  Activity,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  School,
  Users,
} from "lucide-react";
import {
  NavegacionPanel,
  type ItemNavegacion,
} from "@/components/navegacion-panel";

const ITEMS: readonly ItemNavegacion[] = [
  { href: "/dashboard/admin", label: "Resumen", Icon: LayoutDashboard, exacto: true },
  { href: "/dashboard/admin/colegios", label: "Colegios", Icon: School },
  { href: "/dashboard/admin/educadores", label: "Educadores", Icon: GraduationCap },
  { href: "/dashboard/admin/estudiantes", label: "Estudiantes", Icon: Users },
  { href: "/dashboard/admin/tickets", label: "Tickets", Icon: LifeBuoy },
  { href: "/dashboard/admin/actividad", label: "Actividad", Icon: Activity },
];

export function NavegacionAdmin({ nombre }: { nombre: string }) {
  return (
    <NavegacionPanel
      etiqueta="Navegación administrativa"
      titulo="Administración"
      nombre={nombre}
      items={ITEMS}
    />
  );
}
