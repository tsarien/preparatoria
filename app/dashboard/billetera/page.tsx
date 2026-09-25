import Image from "next/image";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { xpEnNivelActual, XP_POR_NIVEL } from "@/lib/gamification";
import type { Personaje, Transaccion } from "@/types/database";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Button } from "@/components/ui/button";
import { EncabezadoPagina } from "@/components/encabezado-pagina";
import { BilleteraForm } from "./billetera-form";
import { simularXp } from "./actions";

type PersonajeResumen = Pick<Personaje, "saldo_billetera" | "salario_mensual" | "nivel" | "xp">;
type TransaccionFila = Pick<Transaccion, "id" | "tipo" | "categoria" | "monto" | "descripcion" | "creado_en">;

export default async function BilleteraPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: personaje } = await supabase
    .from("personajes")
    .select("id, saldo_billetera, salario_mensual, nivel, xp")
    .eq("usuario_id", user.id)
    .single<PersonajeResumen & { id: string }>();

  const { data: transacciones } = personaje
    ? await supabase
        .from("transacciones")
        .select("id, tipo, categoria, monto, descripcion, creado_en")
        .eq("personaje_id", personaje.id)
        .order("creado_en", { ascending: false })
        .limit(20)
        .returns<TransaccionFila[]>()
    : { data: [] as TransaccionFila[] };

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-12">
      <EncabezadoPagina
        volverHref="/dashboard"
        volverEtiqueta="Volver al dashboard"
        titulo="Estado financiero"
        icono="/iconos/icono-saldo.png"
      />

      {/* Resumen + XP */}
      <Card>
        <CardContent className="flex flex-col gap-5 pt-5">
          <div className="flex items-baseline justify-between">
            <span className="flex items-center gap-2 text-sm text-ink-soft">
              <Image src="/iconos/icono-saldo.png" alt="" width={200} height={179} className="h-6 w-auto" />
              Saldo en billetera
            </span>
            <span className="font-mono text-2xl font-medium text-ink">
              ${(personaje?.saldo_billetera ?? 0).toLocaleString("es-CO")}
            </span>
          </div>
          <ProgressBar
            value={xpEnNivelActual(personaje?.xp ?? 0)}
            max={XP_POR_NIVEL}
            label={`Nivel ${personaje?.nivel ?? 1}`}
            animado
          />
          <form action={simularXp}>
            <Button type="submit" variant="outline" size="sm" className="press">
              Otorgar 50 XP (prueba)
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Simular transacción */}
      <Card>
        <CardHeader>
          <CardTitle>Simular una transacción</CardTitle>
          <CardDescription>
            Llama a la función <code className="font-mono">registrar_transaccion</code> en
            Postgres — el saldo de arriba se actualiza de verdad.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BilleteraForm />
        </CardContent>
      </Card>

      {/* Historial */}
      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
        </CardHeader>
        <CardContent>
          {!transacciones || transacciones.length === 0 ? (
            <p className="text-sm text-ink-soft">Todavía no hay transacciones.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {transacciones.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex min-w-0 flex-col">
                    <span className="break-words text-sm text-ink">{t.descripcion || t.categoria || t.tipo}</span>
                    <span className="text-xs text-ink-soft">
                      {new Date(t.creado_en).toLocaleString("es-CO")}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {t.categoria && <Badge tone="ink">{t.categoria}</Badge>}
                    <span
                      className={`font-mono text-sm font-medium ${
                        t.tipo === "ingreso" ? "text-growth" : "text-alert"
                      }`}
                    >
                      {t.tipo === "ingreso" ? "+" : "−"}${t.monto.toLocaleString("es-CO")}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
