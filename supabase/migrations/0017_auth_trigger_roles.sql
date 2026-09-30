-- preparatorIA — Trigger definitivo de alta de usuarios (perfil + rol + personaje).
--
-- Esta es la ÚNICA definición de handle_new_user() que debe quedar aplicada.
-- Antes había cuatro versiones (0002, 0009, 0012, 0017, 0018) y la última exigía que
-- la invitación ya tuviera el UUID del usuario ANTES de que el usuario existiera,
-- algo imposible: por eso todos los educadores terminaban como 'estudiante'.
--
-- Cómo se decide el rol ahora (nunca desde campos que el navegador pueda editar):
--   1. Invitación consumida: el backend marca invitaciones_educador.usada_en justo
--      antes de crear la cuenta con la service-role key; el trigger la encuentra por
--      correo (el correo SÍ existe en el INSERT), la vincula al usuario y asigna educador.
--   2. Respaldo: raw_app_meta_data.rol = 'educador'. app_metadata solo lo escribe la
--      service-role key (signUp público solo escribe raw_user_meta_data).
--   Cualquier otro caso => estudiante.

alter table public.invitaciones_educador
  add column if not exists usuario_id uuid references public.perfiles(id);

create unique index if not exists invitaciones_educador_usuario_idx
  on public.invitaciones_educador (usuario_id)
  where usuario_id is not null;

-- Conversión a uuid que devuelve NULL en vez de lanzar error con valores malformados.
create or replace function public.uuid_seguro(p_texto text)
returns uuid
language sql
immutable
as $$
  select case
    when p_texto ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then p_texto::uuid
  end;
$$;

revoke all on function public.uuid_seguro(text) from public;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_invitacion public.invitaciones_educador;
  v_es_educador boolean := false;
  v_rol text;
  v_colegio_id uuid;
  v_fecha_nacimiento date;
  v_es_menor boolean := false;
  v_cursos text[] := '{}';
begin
  -- 1) ¿Hay una invitación consumida hace poco para este correo?
  select * into v_invitacion
  from public.invitaciones_educador
  where lower(correo_institucional) = lower(new.email)
    and usada_en is not null
    and usuario_id is null
    and usada_en <= expira_en
    and usada_en > now() - interval '10 minutes'
  order by usada_en desc
  limit 1
  for update;

  if found then
    v_es_educador := true;
    v_colegio_id := v_invitacion.colegio_id;
  elsif new.raw_app_meta_data ->> 'rol' = 'educador' then
    -- 2) Respaldo: app_metadata (solo escribible con service-role).
    v_es_educador := true;
    v_colegio_id := public.uuid_seguro(new.raw_app_meta_data ->> 'colegio_id');
  end if;

  v_rol := case when v_es_educador then 'educador' else 'estudiante' end;

  if not v_es_educador then
    v_colegio_id := public.uuid_seguro(v_meta ->> 'colegio_id');
    begin
      v_fecha_nacimiento := nullif(v_meta ->> 'fecha_nacimiento', '')::date;
    exception when others then
      v_fecha_nacimiento := null; -- fecha malformada: no bloquea el registro
    end;
    v_es_menor := v_fecha_nacimiento is not null
      and age(v_fecha_nacimiento) < interval '18 years';
  elsif jsonb_typeof(v_meta -> 'cursos_educativos') = 'array' then
    v_cursos := array(select jsonb_array_elements_text(v_meta -> 'cursos_educativos'));
  end if;

  -- Un colegio inexistente no debe romper el alta por la llave foránea.
  if v_colegio_id is not null
     and not exists (select 1 from public.colegios where id = v_colegio_id) then
    v_colegio_id := null;
  end if;

  insert into public.perfiles (
    id, nombre, fecha_nacimiento, colegio_id, curso,
    correo_acudiente, consentimiento_acudiente, rol,
    cargo_educativo, area_educativa, cursos_educativos
  )
  values (
    new.id,
    coalesce(nullif(trim(v_meta ->> 'nombre'), ''),
             case when v_es_educador then 'Docente' else 'Estudiante' end),
    v_fecha_nacimiento,
    v_colegio_id,
    case when not v_es_educador then v_meta ->> 'curso' end,
    case when not v_es_educador then v_meta ->> 'correo_acudiente' end,
    case when v_es_menor then 'pendiente' else 'aprobado' end,
    v_rol,
    case when v_es_educador then v_meta ->> 'cargo_educativo' end,
    case when v_es_educador then v_meta ->> 'area_educativa' end,
    v_cursos
  );

  if v_es_educador then
    if v_invitacion.id is not null then
      update public.invitaciones_educador
      set usuario_id = new.id
      where id = v_invitacion.id;
    end if;
  else
    insert into public.personajes (usuario_id, saldo_billetera, salario_mensual, nivel, xp)
    values (new.id, 0, 1200000, 1, 0);

    if v_es_menor then
      insert into public.solicitudes_consentimiento (perfil_id) values (new.id);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public, anon, authenticated;
