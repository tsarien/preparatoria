"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { User, Calendar, School, GraduationCap, Mail, Lock } from "lucide-react";
import { registrarEstudiante, type RegistroState } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CampoConIcono } from "@/components/ui/campo-con-icono";

const ESTADO_INICIAL: RegistroState = {};
const TARJETA = "bg-paper-raised/92 shadow-2xl backdrop-blur-xl";

function esMenorDeEdad(fechaNacimiento: string): boolean {
  if (!fechaNacimiento) return false;
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const noHaCumplidoAunEsteAno =
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());
  if (noHaCumplidoAunEsteAno) edad -= 1;
  return edad < 18;
}

export function RegistroForm({ colegios }: { colegios: { nombre: string }[] }) {
  const [state, formAction, isPending] = useActionState(registrarEstudiante, ESTADO_INICIAL);
  const [fechaNacimiento, setFechaNacimiento] = useState("");

  if (state.needsConfirmation) {
    return (
      <Card className={TARJETA}>
        <CardHeader>
          <CardTitle>Revisa tu correo</CardTitle>
          <CardDescription>
            Te enviamos un enlace de confirmación. Ábrelo para activar tu cuenta y luego inicia
            sesión.
          </CardDescription>
        </CardHeader>
        {state.enlaceConsentimiento && (
          <CardContent>
            <EnlaceConsentimientoFallback enlace={state.enlaceConsentimiento} />
          </CardContent>
        )}
      </Card>
    );
  }

  if (state.enlaceConsentimiento) {
    return (
      <Card className={TARJETA}>
        <CardHeader>
          <CardTitle>Cuenta creada</CardTitle>
          <CardDescription>
            Como eres menor de edad, tu acudiente necesita autorizar la cuenta antes de que quede
            activa por completo.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <EnlaceConsentimientoFallback enlace={state.enlaceConsentimiento} />
          <Link href="/dashboard">
            <Button variant="outline">Ir a mi dashboard de todas formas</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={TARJETA}>
      <CardHeader>
        <CardTitle>¡Bienvenido a preparatorIA!</CardTitle>
        <CardDescription>Crea tu cuenta y empieza a construir un mejor futuro.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <CampoConIcono icon={User} label="Nombre completo" name="nombre" type="text" required />
          <CampoConIcono
            icon={Calendar}
            label="Fecha de nacimiento"
            name="fecha_nacimiento"
            type="date"
            required
            value={fechaNacimiento}
            onChange={(e) => setFechaNacimiento(e.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="colegio" className="text-sm font-medium text-ink">
              Colegio
            </label>
            <div className="relative">
              <School className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
              <input
                id="colegio"
                name="colegio"
                list="colegios-sugeridos"
                required
                placeholder="Escribe el nombre — si no aparece, lo creamos"
                className="h-11 w-full rounded-xl border border-line bg-paper/70 pl-10 pr-3 text-sm text-ink outline-none focus-visible:border-primary"
              />
            </div>
            <datalist id="colegios-sugeridos">
              {colegios.map((c) => (
                <option key={c.nombre} value={c.nombre} />
              ))}
            </datalist>
          </div>

          <CampoConIcono icon={GraduationCap} label="Curso (ej. 11-A)" name="curso" type="text" />

          {esMenorDeEdad(fechaNacimiento) && (
            <div className="rounded-xl border border-gold/40 bg-gold-soft p-3">
              <CampoConIcono
                icon={Mail}
                label="Correo de tu acudiente"
                name="correo_acudiente"
                type="email"
                required
                hint="Por ser menor de edad, tu acudiente debe aprobar tu cuenta (Ley 1581 de 2012)."
              />
            </div>
          )}

          <CampoConIcono icon={Mail} label="Correo" name="correo" type="email" required />
          <CampoConIcono icon={Lock} label="Contraseña" name="password" type="password" required minLength={8} />

          {state.error && (
            <p className="text-sm text-alert" role="alert">
              {state.error}
            </p>
          )}

          <Button type="submit" disabled={isPending} className="mt-2">
            {isPending ? "Creando cuenta…" : "Crear cuenta"}
          </Button>

          <p className="text-xs text-ink-soft">
            Al registrarte, aceptas nuestra{" "}
            <Link href="/privacidad" className="underline underline-offset-2">
              política de privacidad
            </Link>
            .
          </p>
        </form>

        <p className="mt-4 text-sm text-ink-soft">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-medium text-ink underline underline-offset-2">
            Inicia sesión
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

function EnlaceConsentimientoFallback({ enlace }: { enlace: string }) {
  return (
    <div className="rounded-xl border border-gold/40 bg-gold-soft p-3 text-sm text-ink">
      <p className="font-medium">Todavía no hay envío de correo configurado (ver README).</p>
      <p className="mt-1 text-ink-soft">
        Para probar el flujo de todos modos, comparte este enlace con el acudiente:
      </p>
      <code className="mt-2 block break-all rounded bg-paper-raised px-2 py-1 font-mono text-xs">
        {enlace}
      </code>
    </div>
  );
}
