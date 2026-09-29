"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { AvatarSelector } from "@/components/educador/avatar-selector";
import {
  actualizarPerfil,
  type ActualizarPerfilState,
} from "@/app/dashboard/ajustes/actions";

const ESTADO_VACIO: ActualizarPerfilState = {};

export function PerfilForm({
  nombre,
  correo,
  colegioId,
  curso,
  avatarId,
  fechaNacimiento,
  colegios,
  esEducador,
}: {
  nombre: string;
  correo: string;
  colegioId: string;
  curso: string;
  avatarId: string;
  fechaNacimiento: string | null;
  colegios: { id: string; nombre: string }[];
  esEducador: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    actualizarPerfil,
    ESTADO_VACIO,
  );
  const fechaFormateada = fechaNacimiento
    ? new Intl.DateTimeFormat("es-CO", {
        dateStyle: "long",
        timeZone: "UTC",
      }).format(new Date(`${fechaNacimiento}T00:00:00Z`))
    : "No registrada";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <AvatarSelector value={avatarId} />
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        Nombre
        <input
          name="nombre"
          required
          minLength={2}
          maxLength={80}
          defaultValue={nombre}
          className="h-11 rounded-lg border border-line bg-paper-raised px-3"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        Correo de la cuenta
        <input
          name="correo"
          type="email"
          required
          defaultValue={correo}
          className="h-11 rounded-lg border border-line bg-paper-raised px-3"
        />
        <span className="text-xs font-normal text-ink-soft">
          Supabase pedirá confirmar el nuevo correo.
        </span>
      </label>

      {esEducador ? (
        <>
          <input type="hidden" name="colegio_id" value={colegioId} />
          <input type="hidden" name="curso" value={curso} />
          <p className="text-sm text-ink-soft">
            La institución asociada no se puede cambiar desde el perfil
            educativo.
          </p>
        </>
      ) : (
        <>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
            Colegio
            <select
              name="colegio_id"
              required
              defaultValue={colegioId}
              className="h-11 rounded-lg border border-line bg-paper-raised px-3"
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
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
            Curso
            <input
              name="curso"
              maxLength={30}
              defaultValue={curso}
              className="h-11 rounded-lg border border-line bg-paper-raised px-3"
            />
          </label>
        </>
      )}

      <div className="rounded-xl border border-line bg-paper p-3">
        <p className="text-sm font-medium text-ink">Fecha de nacimiento</p>
        <p className="mt-1 text-sm text-ink-soft">{fechaFormateada}</p>
        <p className="mt-1 text-xs text-ink-soft">
          Esta fecha está protegida para cuidar las reglas de consentimiento de
          menores. Contacta a preparatorIA si necesitas corregirla.
        </p>
      </div>

      {state.error && (
        <p className="text-sm text-alert" role="alert">
          {state.error}
        </p>
      )}
      {state.mensaje && (
        <p className="text-sm text-growth" role="status">
          {state.mensaje}
        </p>
      )}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}
