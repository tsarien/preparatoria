-- Rol educativo controlado por app_metadata y registro mediante invitación.

alter table public.perfiles
  add column if not exists cargo_educativo text,
  add column if not exists area_educativa text,
  add column if not exists cursos_educativos text[] not null default '{}';

update public.perfiles
set rol = 'estudiante'
where rol not in ('estudiante', 'educador', 'administrador');

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'perfiles_rol_permitido_check'
      and conrelid = 'public.perfiles'::regclass
  ) then
    alter table public.perfiles
      add constraint perfiles_rol_permitido_check
      check (rol in ('estudiante', 'educador', 'administrador'));
  end if;
end;
$$;

create table if not exists public.invitaciones_educador (
  id uuid primary key default gen_random_uuid(),
  colegio_id uuid not null references public.colegios(id),
  correo_institucional text not null,
  codigo_hash text not null unique,
  expira_en timestamptz not null,
  usada_en timestamptz,
  creada_en timestamptz not null default now()
);

alter table public.invitaciones_educador enable row level security;
revoke all on public.invitaciones_educador from anon, authenticated;

-- Solo SQL Editor/backend confiable debe crear invitaciones. codigo_hash es SHA-256
-- de un código aleatorio de al menos 32 bytes; nunca se almacena el código en claro.
create or replace function public.crear_invitacion_educador(
  p_colegio_id uuid,
  p_correo_institucional text,
  p_codigo_hash text,
  p_expira_en timestamptz default now() + interval '7 days'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_codigo_hash !~ '^[a-f0-9]{64}$'
     or p_correo_institucional !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     or p_expira_en <= now()
     or not exists (select 1 from public.colegios where id = p_colegio_id) then
    raise exception 'Invitación inválida.';
  end if;

  insert into public.invitaciones_educador (
    colegio_id, correo_institucional, codigo_hash, expira_en
  )
  values (
    p_colegio_id, lower(trim(p_correo_institucional)), p_codigo_hash, p_expira_en
  )
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.crear_invitacion_educador(uuid, text, text, timestamptz) from public;
grant execute on function public.crear_invitacion_educador(uuid, text, text, timestamptz) to postgres, service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol text;
  v_fecha_nacimiento date;
  v_es_menor boolean;
  v_colegio_id uuid;
begin
  -- raw_user_meta_data puede editarlo el usuario; solo app_metadata asigna educador.
  v_rol := case
    when new.raw_app_meta_data ->> 'rol' = 'educador' then 'educador'
    else 'estudiante'
  end;
  v_colegio_id := case
    when v_rol = 'educador'
      then nullif(new.raw_app_meta_data ->> 'colegio_id', '')::uuid
    else nullif(new.raw_user_meta_data ->> 'colegio_id', '')::uuid
  end;

  if v_rol = 'estudiante' then
    v_fecha_nacimiento := nullif(new.raw_user_meta_data ->> 'fecha_nacimiento', '')::date;
  end if;
  v_es_menor := v_rol = 'estudiante'
    and v_fecha_nacimiento is not null
    and age(v_fecha_nacimiento) < interval '18 years';

  insert into public.perfiles (
    id, nombre, fecha_nacimiento, colegio_id, curso,
    correo_acudiente, consentimiento_acudiente, rol,
    cargo_educativo, area_educativa, cursos_educativos
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', 'Estudiante'),
    v_fecha_nacimiento,
    v_colegio_id,
    new.raw_user_meta_data ->> 'curso',
    new.raw_user_meta_data ->> 'correo_acudiente',
    case when v_es_menor then 'pendiente' else 'aprobado' end,
    v_rol,
    case when v_rol = 'educador' then new.raw_user_meta_data ->> 'cargo_educativo' end,
    case when v_rol = 'educador' then new.raw_user_meta_data ->> 'area_educativa' end,
    case
      when v_rol = 'educador'
        then coalesce(array(select jsonb_array_elements_text(new.raw_user_meta_data -> 'cursos_educativos')), '{}')
      else '{}'
    end
  );

  if v_rol = 'estudiante' then
    insert into public.personajes (usuario_id, saldo_billetera, salario_mensual, nivel, xp)
    values (new.id, 0, 1200000, 1, 0);

    if v_es_menor then
      insert into public.solicitudes_consentimiento (perfil_id) values (new.id);
    end if;
  end if;

  return new;
end;
$$;

drop policy if exists "perfiles: el usuario ve/edita solo su perfil" on public.perfiles;
create policy "perfiles: lectura del propio perfil"
  on public.perfiles for select using (auth.uid() = id);
create policy "perfiles: actualización del propio perfil"
  on public.perfiles for update using (auth.uid() = id) with check (auth.uid() = id);
revoke insert, update, delete on public.perfiles from authenticated;
grant update (nombre, curso, colegio_id) on public.perfiles to authenticated;

-- El ranking por colegio es una vista de estudiante, no una consulta del panel educativo.
create or replace function public.obtener_ranking_colegio()
returns table (nombre text, curso text, nivel int, xp int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colegio_id uuid;
begin
  select colegio_id into v_colegio_id
  from public.perfiles
  where id = auth.uid() and rol = 'estudiante';
  if not found or v_colegio_id is null then return; end if;

  return query
  select p.nombre, p.curso, personaje.nivel, personaje.xp
  from public.perfiles p
  join public.personajes personaje on personaje.usuario_id = p.id
  where p.colegio_id = v_colegio_id and p.rol = 'estudiante'
  order by personaje.xp desc
  limit 50;
end;
$$;

revoke all on function public.obtener_ranking_colegio() from public;
grant execute on function public.obtener_ranking_colegio() to authenticated;