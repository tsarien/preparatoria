-- preparatorIA — Fase 1: creación automática de perfil + personaje al registrarse
-- Ejecuta este archivo en Supabase > SQL Editor (después de 0001_core_schema.sql)

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fecha_nacimiento date;
  v_es_menor boolean;
begin
  v_fecha_nacimiento := (new.raw_user_meta_data ->> 'fecha_nacimiento')::date;
  v_es_menor := v_fecha_nacimiento is not null
    and age(v_fecha_nacimiento) < interval '18 years';

  insert into public.perfiles (
    id, nombre, fecha_nacimiento, colegio_id, curso,
    correo_acudiente, consentimiento_acudiente
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', 'Estudiante'),
    v_fecha_nacimiento,
    nullif(new.raw_user_meta_data ->> 'colegio_id', '')::uuid,
    new.raw_user_meta_data ->> 'curso',
    new.raw_user_meta_data ->> 'correo_acudiente',
    case when v_es_menor then 'pendiente' else 'aprobado' end
  );

  -- "Mi Vida Simulada" arranca con un salario base simulado, no en cero.
  insert into public.personajes (usuario_id, saldo_billetera, salario_mensual, nivel, xp)
  values (new.id, 0, 1200000, 1, 0);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
