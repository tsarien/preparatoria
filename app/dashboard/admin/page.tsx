import Link from "next/link";
import {
  GraduationCap,
  LifeBuoy,
  MailPlus,
  School,
  UserX,
  Users,
} from "lucide-react";
import { GameModuleShell } from "@/components/game/game-module-shell";
import { EncabezadoAdmin, TarjetaMetrica, VacioAdmin } from "@/components/admin/ui";
import { obtenerClienteServicio, requireAdmin } from "@/lib/admin-server";
import { contarResumen } from "@/lib/admin-datos";
import { ETIQUETAS_ACCION, formatearFechaHora } from "@/lib/admin";

export default async function AdminResumenPage() {
  const { nombre } = await requireAdmin();
  const servicio = obtenerClienteServicio();
  const [resumen, { data: actividad }] = await Promise.all([
    contarResumen(servicio),
    servicio
      .from("actividad_sistema")
      .select("id, actor_id, accion, entidad, detalle, creado_en")
      .order("creado_en", { ascending: false })
      .limit(8),
  ]);

  const actores = [...new Set((actividad ?? []).map((a) => a.actor_id).filter(Boolean))] as string[];
  const { data: perfiles } = actores.length
    ? await servicio.from("perfiles").select("id, nombre").in("id", actores)
    : { data: [] as { id: string; nombre: string }[] };
  const nombres = new Map((perfiles ?? []).map((p) => [p.id, p.nombre]));

  return (
    <GameModuleShell ancho="amplio">
      <EncabezadoAdmin
        etiqueta="Administración"
        titulo={`Hola, ${nombre}`}
        descripcion="Estado general de preparatorIA: instituciones, cuentas y soporte."
      />

      <section aria-label="Indicadores" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <TarjetaMetrica Icono={School} etiqueta="Colegios activos" valor={resumen.colegios} href="/dashboard/admin/colegios" />
        <TarjetaMetrica Icono={Users} etiqueta="Estudiantes" valor={resumen.estudiantes} tono="turquoise" href="/dashboard/admin/estudiantes" />
        <TarjetaMetrica Icono={GraduationCap} etiqueta="Educadores" valor={resumen.educadores} tono="gold" href="/dashboard/admin/educadores" />
        <TarjetaMetrica
          Icono={LifeBuoy}
          etiqueta="Tickets abiertos"
          valor={resumen.ticketsAbiertos}
          detalle={`${resumen.ticketsTotal} en total`}
          tono={resumen.ticketsAbiertos > 0 ? "alert" : "primary"}
          href="/dashboard/admin/tickets"
        />
        <TarjetaMetrica Icono={MailPlus} etiqueta="Invitaciones vigentes" valor={resumen.invitacionesVigentes} tono="gold" href="/dashboard/admin/educadores" />
        <TarjetaMetrica Icono={UserX} etiqueta="Cuentas inactivas" valor={resumen.cuentasInactivas} tono="primary" />
      </section>

      <section aria-labelledby="actividad-titulo" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="actividad-titulo" className="font-display text-xl font-semibold text-ink">
            Actividad reciente
          </h2>
          <Link href="/dashboard/admin/actividad" className="text-sm font-semibold text-primary underline underline-offset-2">
            Ver todo
          </Link>
        </div>
        {(actividad ?? []).length === 0 ? (
          <VacioAdmin>Aún no hay acciones administrativas registradas.</VacioAdmin>
        ) : (
          <ul className="game-card divide-y divide-line rounded-2xl bg-paper-raised">
            {(actividad ?? []).map((a) => (
              <li key={a.id} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="min-w-0 break-words text-sm text-ink">
                  <strong>{ETIQUETAS_ACCION[a.accion] ?? a.accion}</strong>
                  {a.detalle ? <span className="text-ink-soft"> · {a.detalle}</span> : null}
                </p>
                <p className="shrink-0 text-xs text-ink-soft">
                  {a.actor_id ? (nombres.get(a.actor_id) ?? "Administrador") : "Sistema"} · {formatearFechaHora(a.creado_en)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </GameModuleShell>
  );
}
