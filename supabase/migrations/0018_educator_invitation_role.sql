-- Asigna educador desde una invitación consumida y vinculada al UUID de Auth.
-- No depende del momento en que GoTrue persiste raw_app_meta_data.

alter table public.invitaciones_educador
  add column if not exists usuario_id uuid;

create unique index if not exists invitaciones_educador_usuario_idx
  on public.invitaciones_educador (usuario_id)
  where usuario_id is not null;

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
  v_es_educador boolean := false;
  v_colegio_id uuid;
begin
  select invitacion.colegio_id
    into v_colegio_id
  from public.invitaciones_educador as invitacion
  where invitacion.usuario_id = new.id
    and lower(invitacion.correo_institucional) = lower(new.email)
    and invitacion.usada_en is not null
    and invitacion.expira_en > now()
  for update;

  v_es_educador := found;
  v_rol := case when v_es_educador then 'educador' else 'estudiante' end;

  if v_rol = 'estudiante' then
    v_fecha_nacimiento := nullif(new.raw_user_meta_data ->> 'fecha_nacimiento', '')::date;
    v_colegio_id := nullif(new.raw_user_meta_data ->> 'colegio_id', '')::uuid;
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
    case when v_rol = 'estudiante' then new.raw_user_meta_data ->> 'curso' end,
    case when v_rol = 'estudiante' then new.raw_user_meta_data ->> 'correo_acudiente' end,
    case when v_es_menor then 'pendiente' else 'aprobado' end,
    v_rol,
    case when v_es_educador then new.raw_user_meta_data ->> 'cargo_educativo' end,
    case when v_es_educador then new.raw_user_meta_data ->> 'area_educativa' end,
    case
      when v_es_educador
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public, anon, authenticated;