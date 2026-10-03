"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Mail, Lock } from "lucide-react";
import { iniciarSesion, type LoginState } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { CampoConIcono } from "@/components/ui/campo-con-icono";

const ESTADO_INICIAL: LoginState = {};

export function LoginForm({ aviso }: { aviso?: string }) {
  const [state, formAction, isPending] = useActionState(
    iniciarSesion,
    ESTADO_INICIAL,
  );

  return (
    <div className="relative mx-auto w-full max-w-md">
      <Card
        tone="game"
        className="bg-paper-raised/92 shadow-2xl backdrop-blur-xl"
      >
        <CardHeader>
          <CardTitle>Inicia sesión</CardTitle>
          <CardDescription>Sigue con tu vida simulada.</CardDescription>
        </CardHeader>
        <CardContent>
          {aviso && (
            <p
              className="mb-4 rounded-xl border border-gold/40 bg-gold-soft p-3 text-sm text-ink"
              role="status"
            >
              {aviso}
            </p>
          )}
          <form action={formAction} className="flex flex-col gap-4">
            <CampoConIcono
              icon={Mail}
              label="Correo"
              name="correo"
              type="email"
              required
              autoComplete="email"
            />
            <CampoConIcono
              icon={Lock}
              label="Contraseña"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />

            {state.error && (
              <p className="text-sm text-alert" role="alert">
                {state.error}
              </p>
            )}

            <Button type="submit" disabled={isPending} className="mt-2">
              {isPending ? "Entrando…" : "Entrar"}
            </Button>
          </form>

          <p className="mt-4 text-sm text-ink-soft">
            ¿No tienes cuenta?{" "}
            <Link
              href="/registro"
              className="font-medium text-ink underline underline-offset-2"
            >
              Regístrate
            </Link>
          </p>
          <p className="mt-2 text-sm text-ink-soft">
            ¿Eres profesor o personal educativo?{" "}
            <Link
              href="/registro/educador"
              className="font-medium text-ink underline underline-offset-2"
            >
              Regístrate como educador
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
