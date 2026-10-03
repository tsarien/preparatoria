import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { xpEnNivelActual, XP_POR_NIVEL } from "@/lib/gamification";
import type { Perfil, Personaje } from "@/types/database";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { GameModuleShell } from "@/components/game/game-module-shell";
import { GameBackButton } from "@/components/game/game-back-button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { TemaSelector } from "./tema-selector";
import { PerfilForm } from "@/components/ajustes/perfil-form";
import { PasswordForm } from "@/components/ajustes/password-form";
import { BotonCerrarSesion } from "@/components/boton-cerrar-sesion";
import { calcularEdadPerfil } from "@/lib/perfil";

export default async function AjustesPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: perfil }, { data: personaje }, { data: colegios }] =
    await Promise.all([
      supabase
        .from("perfiles")
        .select("nombre, fecha_nacimiento, colegio_id, curso, rol, avatar_id")
        .eq("id", user.id)
        .single<
          Pick<
            Perfil,
            | "nombre"
            | "fecha_nacimiento"
            | "colegio_id"
            | "curso"
            | "rol"
            | "avatar_id"
          >
        >(),
      supabase
        .from("personajes")
        .select("nivel, xp, saldo_billetera")
        .eq("usuario_id", user.id)
        .single<Pick<Personaje, "nivel" | "xp" | "saldo_billetera">>(),
      supabase.from("colegios").select("id, nombre").order("nombre"),
    ]);

  // El administrador gestiona su cuenta desde su panel; no usa este perfil de juego.
  if (perfil?.rol === "administrador") redirect("/dashboard/admin");

  const nombre = perfil?.nombre ?? "Estudiante";
  const xpTotal = personaje?.xp ?? 0;

  return (
    <GameModuleShell ancho="compacto">
      <header className="flex flex-col gap-3">
        <GameBackButton
          href={perfil?.rol === "educador" ? "/dashboard/educador" : "/dashboard"}
          label={perfil?.rol === "educador" ? "Volver al panel" : "Volver al mapa"}
        />
        <div className="flex items-center gap-4">
          <div className="min-w-0">
            <h1 className="wrap-break-word font-display text-2xl font-semibold leading-tight text-ink sm:text-3xl">
              Tu perfil
            </h1>
            <p className="text-sm text-ink-soft">Tu cuenta y progreso</p>
          </div>
        </div>
      </header>

      <Card tone="game">
        <CardHeader>
          <CardTitle>Perfil y avatar</CardTitle>
          <CardDescription>
            Actualiza los datos de tu cuenta y elige una identidad ficticia.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PerfilForm
            nombre={nombre}
            correo={user.email ?? ""}
            colegioId={perfil?.colegio_id ?? ""}
            curso={perfil?.curso ?? ""}
            avatarId={perfil?.avatar_id ?? "avatar_01"}
            fechaNacimiento={perfil?.fecha_nacimiento ?? null}
            colegios={colegios ?? []}
            esEducador={perfil?.rol === "educador"}
          />
          {perfil?.rol === "estudiante" && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
                  {perfil.curso && <span>Curso {perfil.curso}</span>}
                  <span>Nivel {personaje?.nivel ?? 1}</span>
                  <span>
                    ${(personaje?.saldo_billetera ?? 0).toLocaleString("es-CO")}
                  </span>
                </div>
                <Link
                  href="/dashboard/billetera"
                  className="press game-edge inline-flex h-8 items-center justify-center gap-2 rounded-xl border-primary/30 bg-paper-raised px-3 text-sm font-medium text-ink hover:border-primary/50"
                >
                  Billetera{" "}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
              <div className="mt-4">
                <ProgressBar
                  value={xpEnNivelActual(xpTotal)}
                  max={XP_POR_NIVEL}
                  label={`${xpEnNivelActual(xpTotal)} de ${XP_POR_NIVEL} XP para el siguiente nivel`}
                  variant="xp"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card tone="game">
        <CardHeader>
          <CardTitle>Apariencia</CardTitle>
          <CardDescription>
            Elige cómo se ve preparatorIA en este dispositivo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TemaSelector />
          <div className="mt-5 border-t border-line pt-5">
            <PasswordForm />
          </div>
          <div className="mt-4 flex border-t border-line pt-4">
            <BotonCerrarSesion etiquetaVisible />
          </div>
        </CardContent>
      </Card>

      <Card tone="game">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-growth" aria-hidden="true" />
            Privacidad y seguridad
          </CardTitle>
          <CardDescription>
            La cuenta está diseñada para minimizar los datos personales.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-ink-soft">
          <p>
            No se permiten fotografías personales ni direcciones de avatar
            externas. Solo puedes elegir ilustraciones incluidas en
            preparatorIA.
          </p>
          {perfil?.rol === "estudiante" && (
            <p>
              La fecha de nacimiento está protegida porque determina el flujo de
              consentimiento de acudiente para menores de edad.
            </p>
          )}
          {perfil?.rol === "estudiante" &&
            perfil.fecha_nacimiento &&
            calcularEdadPerfil(perfil.fecha_nacimiento) < 18 && (
              <p>
                La cuenta registra el correo del acudiente y el estado de su
                consentimiento conforme al flujo de privacidad de preparatorIA.
              </p>
            )}
          <Link
            href="/privacidad"
            className="w-fit font-medium text-primary underline underline-offset-2"
          >
            Consultar tratamiento de datos
          </Link>
        </CardContent>
      </Card>
    </GameModuleShell>
  );
}
