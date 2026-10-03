"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { User, Calendar, Mail } from "lucide-react";
import { registrarEstudiante, type RegistroState } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { CampoConIcono } from "@/components/ui/campo-con-icono";
import { ColegioCursoCampos } from "@/components/auth/colegio-curso-campos";
import { CamposContrasena } from "@/components/auth/campos-contrasena";
import { esMenorDeEdad } from "@/lib/registro";

const ESTADO_INICIAL: RegistroState = {};
const TARJETA = "bg-paper-raised/92 shadow-2xl backdrop-blur-xl";

export function RegistroForm({
  colegios,
}: {
  colegios: { id: string; nombre: string }[];
}) {
  const [state, formAction, isPending] = useActionState(
    registrarEstudiante,
    ESTADO_INICIAL,
  );
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [hidratado, setHidratado] = useState(false);

  useEffect(() => setHidratado(true), []);

  if (state.needsConfirmation) {
    return (
      <Card className={TARJETA}>
        <CardHeader>
          <CardTitle>Revisa tu correo</CardTitle>
          <CardDescription>
            Te enviamos un enlace de confirmación. Ábrelo para activar tu cuenta
            y luego inicia sesión.
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
            Como eres menor de edad, tu acudiente necesita autorizar la cuenta
            antes de que quede activa por completo.
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
        <CardDescription>
          Crea tu cuenta y empieza a construir un mejor futuro.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          action={formAction}
          className="flex flex-col gap-4"
          data-hidratado={hidratado}
        >
          <CampoConIcono
            icon={User}
            label="Nombre completo"
            name="nombre"
            type="text"
            required
          />
          <CampoConIcono
            icon={Calendar}
            label="Fecha de nacimiento"
            name="fecha_nacimiento"
            type="date"
            required
            value={fechaNacimiento}
            onChange={(e) => setFechaNacimiento(e.target.value)}
          />

          <ColegioCursoCampos colegios={colegios} modo="estudiante" />
          <p className="-mt-2 text-xs text-ink-soft">
            ¿No encuentras tu colegio? Solicita a tu institución que se
            comunique con preparatorIA.
          </p>

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

          <CampoConIcono
            icon={Mail}
            label="Correo"
            name="correo"
            type="email"
            required
          />
          <CamposContrasena />

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
          <Link
            href="/login"
            className="font-medium text-ink underline underline-offset-2"
          >
            Inicia sesión
          </Link>
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          ¿Eres profesor o personal educativo?{" "}
          <Link
            href="/registro/educador"
            className="font-medium text-ink underline underline-offset-2"
          >
            Crear cuenta educativa
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

function EnlaceConsentimientoFallback({ enlace }: { enlace: string }) {
  return (
    <div className="rounded-xl border border-gold/40 bg-gold-soft p-3 text-sm text-ink">
      <p className="font-medium">
        Todavía no hay envío de correo configurado (ver README).
      </p>
      <p className="mt-1 text-ink-soft">
        Para probar el flujo de todos modos, comparte este enlace con el
        acudiente:
      </p>
      <code className="mt-2 block break-all rounded bg-paper-raised px-2 py-1 font-mono text-xs">
        {enlace}
      </code>
    </div>
  );
}
