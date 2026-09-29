-- Corrige el trigger: el INSERT del perfil debe incluir explícitamente el rol.
-- Necesario para proyectos que ya aplicaron 0012_roles_educadores.sql.

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
  -- raw_user_meta_data es editable por el usuario; solo app_metadata asigna educador.
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

-- Reasocia explícitamente el trigger a la versión corregida de la función.
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();