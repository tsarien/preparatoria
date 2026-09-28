import { redirect } from "next/navigation";
import { Wrench } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { xpEnNivelActual, XP_POR_NIVEL } from "@/lib/gamification";
import type { Personaje, Transaccion } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BilleteraForm } from "./billetera-form";
import { simularXp } from "./actions";
import { WalletHero } from "@/components/game/wallet-hero";
import { TransactionRow } from "@/components/game/transaction-row";
import { GameModuleShell } from "@/components/game/game-module-shell";
import { GameBackButton } from "@/components/game/game-back-button";

type PersonajeResumen = Pick<
  Personaje,
  "saldo_billetera" | "salario_mensual" | "nivel" | "xp"
>;
type TransaccionFila = Pick<
  Transaccion,
  "id" | "tipo" | "categoria" | "monto" | "descripcion" | "creado_en"
>;

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

  // ──────────────────────────────────────────────────────────────────────
  // Agregación de PRESENTACIÓN sobre los movimientos ya cargados (últimos 20).
  // No es histórico completo — la UI lo etiqueta explícitamente como tal.
  // Ninguna regla de negocio vive aquí: es sumar lo que ya vino de Supabase.
  // ──────────────────────────────────────────────────────────────────────
  const movs = transacciones ?? [];
  const ingresos = movs
    .filter((t) => t.tipo === "ingreso")
    .reduce((sum, t) => sum + t.monto, 0);
  const gastos = movs
    .filter((t) => t.tipo === "gasto")
    .reduce((sum, t) => sum + t.monto, 0);
  const ahorro = movs
    .filter((t) => t.categoria === "ahorro" || t.categoria === "ahorro_meta")
    .reduce((sum, t) => sum + t.monto, 0);

  const xpTotal = personaje?.xp ?? 0;

  return (
    <GameModuleShell ancho="estandar">
      {/* Encabezado simple — esta no es una misión, es el inventario del personaje */}
      <header className="flex flex-col gap-3">
        <GameBackButton href="/dashboard" label="Volver al dashboard" />
        <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
          Tu billetera
        </h1>
        <p className="text-sm text-ink-soft">
          Todo lo que entra y sale de tu vida simulada, en un solo lugar.
        </p>
      </header>

      {/* Card principal */}
      <WalletHero
        saldo={personaje?.saldo_billetera ?? 0}
        salarioMensual={personaje?.salario_mensual ?? 0}
        nivel={personaje?.nivel ?? 1}
        xpEnNivel={xpEnNivelActual(xpTotal)}
        xpPorNivel={XP_POR_NIVEL}
        ingresos={ingresos}
        gastos={gastos}
        ahorro={ahorro}
      />

      {/* Movimientos */}
      <section className="game-card overflow-hidden rounded-2xl bg-paper-raised">
        <div className="flex items-center justify-between gap-3 border-b-2 border-line bg-gradient-to-r from-primary-soft via-paper-raised to-gold-soft px-4 py-3">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-ink">
            Movimientos
          </h2>
          <span className="shrink-0 rounded-full border border-line bg-paper-raised px-2.5 py-0.5 font-mono text-[11px] font-semibold text-ink-soft">
            Últimos {movs.length}
          </span>
        </div>

        {movs.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-soft">
            Todavía no hay movimientos. Completa un desafío o simula una
            transacción abajo.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {movs.map((t) => (
              <TransactionRow
                key={t.id}
                tipo={t.tipo}
                monto={t.monto}
                categoria={t.categoria}
                descripcion={t.descripcion}
                fecha={t.creado_en}
                esAhorro={
                  t.categoria === "ahorro" || t.categoria === "ahorro_meta"
                }
              />
            ))}
          </ul>
        )}
      </section>

      {/* Herramienta de prueba — claramente diferenciada del contenido real */}
      {process.env.NODE_ENV !== "production" && (
        <Card tone="game" className="border-dashed">
          <div className="flex flex-col gap-4 p-5">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border-2 border-line bg-paper text-ink-soft"
              >
                <Wrench className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="font-display text-sm font-semibold text-ink">
                  Herramienta de prueba
                </p>
                <p className="text-xs text-ink-soft">
                  Solo para ti — simula movimientos y otorga XP para ver el
                  sistema en acción.
                </p>
              </div>
            </div>

            <BilleteraForm />

            <div className="border-t border-line pt-4">
              <form action={simularXp}>
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  className="press"
                >
                  Otorgar 50 XP (prueba)
                </Button>
              </form>
            </div>
          </div>
        </Card>
      )}
    </GameModuleShell>
  );
}
