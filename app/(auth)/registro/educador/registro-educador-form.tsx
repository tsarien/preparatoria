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
          <CampoConIcono
            icon={Lock}
            label="Contraseña"
            name="password"
            type="password"
            required
            minLength={8}
          />

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="colegio_id"
              className="text-sm font-medium text-ink"
            >
              Colegio / institución
            </label>
            <div className="relative">
              <School
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
                aria-hidden="true"
              />
              <select
                id="colegio_id"
                name="colegio_id"
                required
                defaultValue=""
                className="h-11 w-full rounded-xl border border-line bg-paper-raised pl-10 pr-3 text-sm text-ink focus-visible:border-primary"
              >
                <option value="" disabled>
                  Selecciona tu colegio
                </option>
                {colegios.map((colegio) => (
                  <option key={colegio.id} value={colegio.id}>
                    {colegio.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

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
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cursos" className="text-sm font-medium text-ink">
              Curso(s) que acompaña
            </label>
            <input
              id="cursos"
              name="cursos"
              type="text"
              required
              maxLength={300}
              placeholder="Ej. 10-A, 11-B"
              className="h-11 w-full rounded-xl border border-line bg-paper-raised px-3 text-sm text-ink focus-visible:border-primary"
            />
          </div>

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
