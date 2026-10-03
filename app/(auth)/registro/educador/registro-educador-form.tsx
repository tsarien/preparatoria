"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CampoConIcono } from "@/components/ui/campo-con-icono";
import { CARGOS_EDUCATIVOS } from "@/lib/educadores";
import { Lock, Mail, School, User } from "lucide-react";
import { ColegioCursoCampos } from "@/components/auth/colegio-curso-campos";
import { CamposContrasena } from "@/components/auth/campos-contrasena";
import { registrarEducador, type RegistroEducadorState } from "./actions";

const ESTADO_VACIO: RegistroEducadorState = {};
const TARJETA = "bg-paper-raised/92 shadow-2xl backdrop-blur-xl";

export function RegistroEducadorForm({
  colegios,
}: {
  colegios: { id: string; nombre: string }[];
}) {
  const [state, formAction, isPending] = useActionState(
    registrarEducador,
    ESTADO_VACIO,
  );

  if (state.creada) {
    return (
      <Card className={TARJETA}>
        <CardHeader>
          <CardTitle>Cuenta educativa creada</CardTitle>
          <CardDescription>
            Tu cuenta fue verificada con la invitación institucional. Ya puedes
            iniciar sesión.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/login">
            <Button>Ir a iniciar sesión</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={TARJETA}>
      <CardHeader>
        <CardTitle>Registro educativo</CardTitle>
        <CardDescription>
          El código institucional vincula esta cuenta con un colegio y un correo
          autorizados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <CampoConIcono
            icon={User}
            label="Nombre completo"
            name="nombre"
            type="text"
            required
            maxLength={80}
          />
          <CampoConIcono
            icon={Mail}
            label="Correo institucional"
            name="correo"
            type="email"
            required
          />
          <CamposContrasena />

          <ColegioCursoCampos
            colegios={colegios}
            modo="educador"
            idPrefijo="edu"
          />

          <CampoConIcono
            icon={Lock}
            label="Código de invitación institucional"
            name="codigo_invitacion"
            type="text"
            required
            autoComplete="off"
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="cargo" className="text-sm font-medium text-ink">
              Cargo
            </label>
            <select
              id="cargo"
              name="cargo"
              required
              defaultValue=""
              className="h-11 w-full rounded-xl border border-line bg-paper-raised px-3 text-sm text-ink focus-visible:border-primary"
            >
              <option value="" disabled>
                Selecciona tu cargo
              </option>
              {CARGOS_EDUCATIVOS.map((cargo) => (
                <option key={cargo} value={cargo}>
                  {cargo}
                </option>
              ))}
            </select>
          </div>

          <CampoConIcono
            icon={School}
            label="Área o asignatura"
            name="area"
            type="text"
            required
            maxLength={80}
          />
          {state.error && (
            <p className="text-sm text-alert" role="alert">
              {state.error}
            </p>
          )}
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creando cuenta…" : "Crear cuenta educativa"}
          </Button>
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
          ¿Eres estudiante?{" "}
          <Link
            href="/registro"
            className="font-medium text-ink underline underline-offset-2"
          >
            Regístrate aquí
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
