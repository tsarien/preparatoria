-- preparatorIA — 0020: base del rol administrador (colegios, cursos, auditoría).
--
-- QUÉ HACE
--   1. colegios: activo / creado_en / actualizado_en. Desactivar es preferible a borrar porque
--      perfiles, invitaciones e informes referencian al colegio.
--   2. cursos_colegio: cursos o grupos de cada colegio. Es la ÚNICA fuente de cursos para los
--      selectores de registro (estudiante y educador); el servidor vuelve a validarlos.
--   3. es_administrador(): función SECURITY DEFINER para usar en políticas RLS sin recursión.
--   4. actividad_sistema: auditoría básica de acciones administrativas (solo lectura para el admin).
--   5. Política de lectura de perfiles para el administrador.
--   6. actualizar_perfil(): valida que el curso pertenezca al colegio y que el colegio esté activo.
--
-- SEGURIDAD
--   Los clientes (anon/authenticated) NO pueden escribir colegios ni cursos. El administrador opera
--   desde el servidor con la service-role key DESPUÉS de verificar auth.uid() + rol (lib/admin).

-- ─────────────────────────────────────────────
-- 1. colegios
-- ─────────────────────────────────────────────
alter table public.colegios
  add column if not exists activo boolean not null default true,
  add column if not exists creado_en timestamptz not null default now(),
  add column if not exists actualizado_en timestamptz not null default now();

-- ─────────────────────────────────────────────
-- 3. es_administrador()
-- ─────────────────────────────────────────────
create or replace function public.es_administrador()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfiles
    where id = auth.uid() and rol = 'administrador' and activo
  );
$$;

revoke all on function public.es_administrador() from public;
grant execute on function public.es_administrador() to authenticated;

-- Colegio del usuario actual. SECURITY DEFINER porque anon/authenticated no pueden leer perfiles
-- directamente y una subconsulta dentro de la política se ejecuta con sus privilegios.
create or replace function public.mi_colegio_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select colegio_id from public.perfiles where id = auth.uid();
$$;

revoke all on function public.mi_colegio_id() from public;
grant execute on function public.mi_colegio_id() to anon, authenticated;

-- Lectura pública solo de colegios activos (más el propio colegio del usuario aunque se desactive).
drop policy if exists "colegios: lectura pública" on public.colegios;
drop policy if exists "colegios: lectura pública de activos" on public.colegios;
create policy "colegios: lectura pública de activos"
  on public.colegios for select
  using (activo or id = public.mi_colegio_id());

grant select on public.colegios to anon, authenticated;
grant select, insert, update, delete on public.colegios to service_role;
revoke insert, update, delete on public.colegios from anon, authenticated;

-- ─────────────────────────────────────────────
-- 2. cursos_colegio
-- ─────────────────────────────────────────────
create table if not exists public.cursos_colegio (
  id uuid primary key default gen_random_uuid(),
  colegio_id uuid not null references public.colegios(id) on delete cascade,
  nombre text not null check (length(trim(nombre)) between 1 and 30),
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create unique index if not exists cursos_colegio_nombre_unico_idx
  on public.cursos_colegio (colegio_id, lower(trim(nombre)));
create index if not exists cursos_colegio_colegio_idx
  on public.cursos_colegio (colegio_id) where activo;

alter table public.cursos_colegio enable row level security;

drop policy if exists "cursos_colegio: lectura pública de activos" on public.cursos_colegio;
create policy "cursos_colegio: lectura pública de activos"
  on public.cursos_colegio for select
  using (
    activo
    and exists (
      select 1 from public.colegios c
      where c.id = cursos_colegio.colegio_id and c.activo
    )
  );

revoke all on public.cursos_colegio from anon, authenticated;
grant select on public.cursos_colegio to anon, authenticated;
grant all on public.cursos_colegio to service_role;

-- ─────────────────────────────────────────────
-- 4. actividad_sistema
-- ─────────────────────────────────────────────
create table if not exists public.actividad_sistema (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.perfiles(id) on delete set null,
  accion text not null check (length(accion) between 1 and 60),
  entidad text not null check (length(entidad) between 1 and 40),
  entidad_id text check (length(entidad_id) <= 80),
  detalle text check (length(detalle) <= 200),
  creado_en timestamptz not null default now()
);

create index if not exists actividad_sistema_fecha_idx
  on public.actividad_sistema (creado_en desc);

alter table public.actividad_sistema enable row level security;

drop policy if exists "actividad_sistema: lectura del administrador" on public.actividad_sistema;
create policy "actividad_sistema: lectura del administrador"
  on public.actividad_sistema for select
  using (public.es_administrador());

revoke all on public.actividad_sistema from anon, authenticated;
grant select on public.actividad_sistema to authenticated;
grant all on public.actividad_sistema to service_role;

-- ─────────────────────────────────────────────
-- 5. El administrador puede leer perfiles (listados de cuentas, nombres en tickets)
-- ─────────────────────────────────────────────
drop policy if exists "perfiles: lectura del administrador" on public.perfiles;
create policy "perfiles: lectura del administrador"
  on public.perfiles for select
  using (public.es_administrador());

grant select, insert, update, delete on public.perfiles to service_role;

-- ─────────────────────────────────────────────
-- 6. actualizar_perfil(): colegio activo + curso del colegio
-- ─────────────────────────────────────────────
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
  v_curso text := nullif(trim(p_curso), '');
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
  if p_nombre is null or length(trim(p_nombre)) not between 2 and 80
     or trim(p_nombre) ~ '[^[:alpha:] .''-]'
     or v_curso is not null and length(v_curso) > 30
     or v_curso is not null and v_curso ~ '[^[:alnum:] .''-]'
     or p_avatar_id not in (
       'avatar_01', 'avatar_02', 'avatar_03', 'avatar_04',
       'avatar_05', 'avatar_06', 'avatar_07', 'avatar_08'
     ) then
    raise exception 'Datos de perfil inválidos.';
  end if;

  select * into v_perfil
  from public.perfiles
  where id = auth.uid() and activo
  for update;
  if not found then raise exception 'Perfil no encontrado.'; end if;

  if v_perfil.rol in ('educador', 'administrador')
     and p_colegio_id is distinct from v_perfil.colegio_id then
    raise exception 'La institución educativa no puede cambiarse desde el perfil.';
  end if;

  if p_colegio_id is not null and p_colegio_id is distinct from v_perfil.colegio_id
     and not exists (select 1 from public.colegios where id = p_colegio_id and activo) then
    raise exception 'El colegio seleccionado no existe.';
  end if;

  -- Si el colegio ya tiene cursos configurados, el curso debe ser uno de ellos.
  if v_perfil.rol = 'estudiante' and v_curso is not null and p_colegio_id is not null
     and exists (select 1 from public.cursos_colegio where colegio_id = p_colegio_id and activo)
     and not exists (
       select 1 from public.cursos_colegio
       where colegio_id = p_colegio_id and activo and lower(trim(nombre)) = lower(v_curso)
     ) then
    raise exception 'El curso no pertenece al colegio seleccionado.';
  end if;

  if v_perfil.nombre is distinct from trim(p_nombre) then v_cambios := array_append(v_cambios, 'nombre_modificado'); end if;
  if v_perfil.curso is distinct from v_curso then v_cambios := array_append(v_cambios, 'curso_modificado'); end if;
  if v_perfil.colegio_id is distinct from p_colegio_id then v_cambios := array_append(v_cambios, 'colegio_modificado'); end if;
  if v_perfil.avatar_id is distinct from p_avatar_id then v_cambios := array_append(v_cambios, 'avatar_modificado'); end if;

  update public.perfiles
  set nombre = trim(p_nombre),
      curso = v_curso,
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
