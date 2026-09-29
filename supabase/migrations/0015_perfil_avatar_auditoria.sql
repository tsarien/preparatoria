-- Avatar cerrado, auditoría minimizada y permisos de actualización por columna.

alter table public.perfiles
  add column if not exists avatar_id text not null default 'avatar_01';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'perfiles_avatar_id_check'
      and conrelid = 'public.perfiles'::regclass
  ) then
    alter table public.perfiles
      add constraint perfiles_avatar_id_check
      check (avatar_id in (
        'avatar_01', 'avatar_02', 'avatar_03', 'avatar_04',
        'avatar_05', 'avatar_06', 'avatar_07', 'avatar_08'
      ));
  end if;
end;
$$;

create table if not exists public.cambios_perfil (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfiles(id),
  tipo_cambio text not null check (tipo_cambio in (
    'nombre_modificado', 'correo_modificado', 'colegio_modificado',
    'curso_modificado', 'avatar_modificado'
  )),
  descripcion text not null check (length(descripcion) <= 160),
  creado_en timestamptz not null default now()
);

create index if not exists cambios_perfil_usuario_fecha_idx
  on public.cambios_perfil (usuario_id, creado_en desc);

alter table public.cambios_perfil enable row level security;
create policy "cambios_perfil: lectura propia"
  on public.cambios_perfil for select using (auth.uid() = usuario_id);
revoke insert, update, delete on public.cambios_perfil from authenticated;

revoke update on public.perfiles from authenticated;
revoke update (nombre, curso, colegio_id) on public.perfiles from authenticated;

create or replace function public.registrar_cambio_correo()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
  insert into public.cambios_perfil (usuario_id, tipo_cambio, descripcion)
  values (auth.uid(), 'correo_modificado', 'correo modificado');
end;
$$;

revoke all on function public.registrar_cambio_correo() from public;
grant execute on function public.registrar_cambio_correo() to authenticated;

create or replace function public.actualizar_perfil(
  p_nombre text,
  p_curso text,
  p_colegio_id uuid,
  p_avatar_id text
)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_perfil public.perfiles;
  v_cambios text[] := '{}';
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
  if p_nombre is null or length(trim(p_nombre)) not between 2 and 80
     or trim(p_nombre) ~ '[^[:alpha:] .''-]'
     or p_curso is not null and length(p_curso) > 30
     or p_curso is not null and p_curso ~ '[^[:alnum:] .''-]'
     or p_avatar_id not in (
       'avatar_01', 'avatar_02', 'avatar_03', 'avatar_04',
       'avatar_05', 'avatar_06', 'avatar_07', 'avatar_08'
     ) then
    raise exception 'Datos de perfil inválidos.';
  end if;
  if p_colegio_id is not null and not exists (
    select 1 from public.colegios where id = p_colegio_id
  ) then
    raise exception 'El colegio seleccionado no existe.';
  end if;

  select * into v_perfil
  from public.perfiles
  where id = auth.uid()
  for update;
  if not found then raise exception 'Perfil no encontrado.'; end if;
  if v_perfil.rol = 'educador' and p_colegio_id is distinct from v_perfil.colegio_id then
    raise exception 'La institución educativa no puede cambiarse desde el perfil.';
  end if;

  if v_perfil.nombre is distinct from trim(p_nombre) then v_cambios := array_append(v_cambios, 'nombre_modificado'); end if;
  if v_perfil.curso is distinct from nullif(trim(p_curso), '') then v_cambios := array_append(v_cambios, 'curso_modificado'); end if;
  if v_perfil.colegio_id is distinct from p_colegio_id then v_cambios := array_append(v_cambios, 'colegio_modificado'); end if;
  if v_perfil.avatar_id is distinct from p_avatar_id then v_cambios := array_append(v_cambios, 'avatar_modificado'); end if;

  update public.perfiles
  set nombre = trim(p_nombre),
      curso = nullif(trim(p_curso), ''),
      colegio_id = p_colegio_id,
      avatar_id = p_avatar_id
  where id = auth.uid();

  insert into public.cambios_perfil (usuario_id, tipo_cambio, descripcion)
  select auth.uid(), filas.cambio, replace(filas.cambio, '_', ' ')
  from unnest(v_cambios) as filas(cambio);

  return v_cambios;
end;
$$;

revoke all on function public.actualizar_perfil(text, text, uuid, text) from public;
grant execute on function public.actualizar_perfil(text, text, uuid, text) to authenticated;