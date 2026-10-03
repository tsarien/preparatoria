-- preparatorIA — 0021: invitaciones de educador gestionables por el administrador.
--
-- QUÉ HACE
--   1. invitaciones_educador: revocada_en (revocar sin borrar historial) y creada_por (auditoría).
--   2. Solo puede existir UNA invitación vigente (sin usar y sin revocar) por colegio + correo.
--      "Regenerar" = revocar la anterior + crear una nueva (lo hace el servidor).
--   3. Privilegios: solo service_role opera sobre la tabla (el admin pasa por el servidor, que
--      verifica auth.uid() + rol antes de usar la service-role key).
--
-- NO CAMBIA crear_invitacion_educador(): se reutiliza tal cual (valida hash SHA-256, correo,
-- expiración futura y colegio existente). El código en claro nunca se guarda; se muestra una vez.

alter table public.invitaciones_educador
  add column if not exists revocada_en timestamptz,
  add column if not exists creada_por uuid references public.perfiles(id) on delete set null;

-- Limpia duplicados vigentes previos (deja la más reciente) antes de crear el índice único.
update public.invitaciones_educador i
set revocada_en = now()
where i.usada_en is null
  and i.revocada_en is null
  and exists (
    select 1 from public.invitaciones_educador j
    where j.colegio_id = i.colegio_id
      and lower(j.correo_institucional) = lower(i.correo_institucional)
      and j.usada_en is null
      and j.revocada_en is null
      and (j.creada_en, j.id) > (i.creada_en, i.id)
  );

create unique index if not exists invitaciones_vigente_unica_idx
  on public.invitaciones_educador (colegio_id, lower(correo_institucional))
  where usada_en is null and revocada_en is null;

create index if not exists invitaciones_colegio_idx
  on public.invitaciones_educador (colegio_id, creada_en desc);

revoke all on public.invitaciones_educador from anon, authenticated;
grant select, update on public.invitaciones_educador to service_role;
