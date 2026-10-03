-- preparatorIA — 0019: definición ÚNICA y correcta de handle_new_user() + separación educador/estudiante.
--
-- QUÉ CORRIGE
--   Las migraciones 0017_auth_trigger_roles, 0017_fix_auth_profile_trigger y 0018 redefinen
--   handle_new_user(). Al ordenarse alfabéticamente gana la 0018, que exige que la invitación ya
--   tenga el UUID del usuario ANTES de que el usuario exista (imposible): todo educador quedaba como
--   'estudiante', sin colegio y con personaje dentro del ranking. Esta migración NO edita las
--   anteriores: las reemplaza con CREATE OR REPLACE, así que esta es la versión que queda vigente.
--
-- QUÉ HACE
--   1. perfiles.activo: permite desactivar cuentas (la app cierra sesión y Auth las bloquea).
--   2. personajes.modo_juego: 'estudiante' | 'educador_demo'. El educador juega con un personaje
--      de práctica que se EXCLUYE del ranking, de los reportes y de los eventos diarios.
--   3. handle_new_user(): decide el rol SOLO con datos que el navegador no puede editar:
--        administrador → raw_app_meta_data.rol (solo la service-role escribe app_metadata)
--        educador      → invitación consumida por el backend para ese correo (ventana de 10 min)
--                        o, como respaldo, raw_app_meta_data.rol = 'educador'
--        estudiante    → cualquier otro caso. EXIGE fecha de nacimiento válida: sin ella el alta se
--                        rechaza (así nadie se salta el consentimiento del acudiente por la API).
--   4. generar_eventos_diarios(): ignora personajes de demostración y cuentas inactivas.
--   5. obtener_ranking_colegio(): solo estudiantes activos, e incluye avatar_id y es_usuario_actual
--      (para marcar "tú" sin comparar por nombre y sin exponer ids ajenos).

-- ─────────────────────────────────────────────
-- 1 y 2. Columnas nuevas
-- ─────────────────────────────────────────────
alter table public.perfiles
  add column if not exists activo boolean not null default true;

alter table public.personajes
  add column if not exists modo_juego text not null default 'estudiante';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'personajes_modo_juego_check'
      and conrelid = 'public.personajes'::regclass
  ) then
    alter table public.personajes
      add constraint personajes_modo_juego_check
      check (modo_juego in ('estudiante', 'educador_demo'));
  end if;
end;
$$;

create index if not exists personajes_modo_juego_idx on public.personajes (modo_juego);

-- ─────────────────────────────────────────────
-- 3. handle_new_user() definitiva
-- ─────────────────────────────────────────────
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
  v_app jsonb := coalesce(new.raw_app_meta_data, '{}'::jsonb);
  v_invitacion public.invitaciones_educador;
  v_rol text := 'estudiante';
  v_colegio_id uuid;
  v_fecha date;
  v_es_menor boolean := false;
  v_cursos text[] := '{}';
  v_nombre text;
begin
  -- Rol: nunca desde user_metadata (lo edita el usuario en signUp).
  if v_app ->> 'rol' = 'administrador' then
    v_rol := 'administrador';
  else
    select * into v_invitacion
    from public.invitaciones_educador
    where lower(correo_institucional) = lower(new.email)
      and usada_en is not null
      and usuario_id is null
      and usada_en > now() - interval '10 minutes'
    order by usada_en desc
    limit 1
    for update;

    if found then
      v_rol := 'educador';
      v_colegio_id := v_invitacion.colegio_id;
    elsif v_app ->> 'rol' = 'educador' then
      v_rol := 'educador';
      v_colegio_id := public.uuid_seguro(v_app ->> 'colegio_id');
    end if;
  end if;

  if v_rol = 'estudiante' then
    v_colegio_id := public.uuid_seguro(v_meta ->> 'colegio_id');
    begin
      v_fecha := nullif(v_meta ->> 'fecha_nacimiento', '')::date;
    exception when others then
      v_fecha := null;
    end;
    -- Fecha obligatoria: sin ella no se puede decidir si hace falta el consentimiento del acudiente.
    if v_fecha is null or v_fecha > current_date or v_fecha < date '1900-01-01' then
      raise exception 'La fecha de nacimiento es obligatoria y debe ser válida.'
        using errcode = '22023';
    end if;
    v_es_menor := age(v_fecha) < interval '18 years';
  elsif v_rol = 'educador'
        and jsonb_typeof(v_meta -> 'cursos_educativos') = 'array' then
    v_cursos := array(
      select left(curso, 30)
      from jsonb_array_elements_text(v_meta -> 'cursos_educativos') as curso
      limit 10
    );
  end if;

  -- Un colegio inexistente no debe romper el alta por la llave foránea.
  if v_colegio_id is not null
     and not exists (select 1 from public.colegios where id = v_colegio_id) then
    v_colegio_id := null;
  end if;

  v_nombre := left(
    coalesce(
      nullif(trim(v_meta ->> 'nombre'), ''),
      case v_rol
        when 'educador' then 'Docente'
        when 'administrador' then 'Administrador'
        else 'Estudiante'
      end
    ),
    80
  );

  insert into public.perfiles (
    id, nombre, fecha_nacimiento, colegio_id, curso,
    correo_acudiente, consentimiento_acudiente, rol,
    cargo_educativo, area_educativa, cursos_educativos
  )
  values (
    new.id,
    v_nombre,
    case when v_rol = 'estudiante' then v_fecha end,
    v_colegio_id,
    case when v_rol = 'estudiante' then left(v_meta ->> 'curso', 30) end,
    case when v_rol = 'estudiante' and v_es_menor then left(v_meta ->> 'correo_acudiente', 254) end,
    case when v_es_menor then 'pendiente' else 'aprobado' end,
    v_rol,
    case when v_rol = 'educador' then left(v_meta ->> 'cargo_educativo', 80) end,
    case when v_rol = 'educador' then left(v_meta ->> 'area_educativa', 80) end,
    v_cursos
  );

  if v_rol = 'estudiante' then
    insert into public.personajes (usuario_id, saldo_billetera, salario_mensual, nivel, xp, modo_juego)
    values (new.id, 0, 1200000, 1, 0, 'estudiante');

    if v_es_menor then
      insert into public.solicitudes_consentimiento (perfil_id) values (new.id);
    end if;
  elsif v_rol = 'educador' then
    -- Personaje de práctica: permite explorar el juego sin tocar el ambiente de estudiantes.
    insert into public.personajes (usuario_id, saldo_billetera, salario_mensual, nivel, xp, modo_juego)
    values (new.id, 0, 1200000, 1, 0, 'educador_demo');

    if v_invitacion.id is not null then
      update public.invitaciones_educador
      set usuario_id = new.id
      where id = v_invitacion.id;
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

-- Educadores que ya existan sin personaje reciben el personaje de práctica.
insert into public.personajes (usuario_id, saldo_billetera, salario_mensual, nivel, xp, modo_juego)
select p.id, 0, 1200000, 1, 0, 'educador_demo'
from public.perfiles p
where p.rol = 'educador'
  and not exists (select 1 from public.personajes x where x.usuario_id = p.id);

-- ─────────────────────────────────────────────
-- 4. Eventos diarios: solo personajes de estudiantes activos
-- ─────────────────────────────────────────────
create or replace function public.generar_eventos_diarios()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_personaje record;
  v_num_eventos int;
  v_tipo text;
  v_monto numeric;
  v_descripcion text;
  v_tipos text[] := array['factura_inesperada', 'imprevisto_medico', 'bono_inesperado', 'oferta_sospechosa'];
  i int;
begin
  for v_personaje in
    select personaje.id
    from public.personajes personaje
    join public.perfiles perfil on perfil.id = personaje.usuario_id
    where personaje.modo_juego = 'estudiante'
      and perfil.rol = 'estudiante'
      and perfil.activo
  loop
    v_num_eventos := floor(random() * 3)::int;

    for i in 1..v_num_eventos loop
      v_tipo := v_tipos[1 + floor(random() * array_length(v_tipos, 1))::int];

      case v_tipo
        when 'factura_inesperada' then
          v_monto := round((20000 + random() * 60000)::numeric, -3);
          v_descripcion := 'Se dañó algo en casa y toca arreglarlo esta semana.';
        when 'imprevisto_medico' then
          v_monto := round((30000 + random() * 70000)::numeric, -3);
          v_descripcion := 'Te enfermaste y tuviste que ir a una cita médica.';
        when 'bono_inesperado' then
          v_monto := round((20000 + random() * 40000)::numeric, -3);
          v_descripcion := 'Un familiar te mandó una plata de sorpresa.';
        when 'oferta_sospechosa' then
          v_monto := round((50000 + random() * 150000)::numeric, -3);
          v_descripcion := 'Te llega un mensaje: "invierte hoy y dobla tu plata en una semana".';
      end case;

      insert into public.eventos_aleatorios (personaje_id, tipo, descripcion, impacto_monto, estado)
      values (v_personaje.id, v_tipo, v_descripcion, v_monto, 'pendiente');
    end loop;
  end loop;
end;
$$;

revoke all on function public.generar_eventos_diarios() from public, anon, authenticated;
grant execute on function public.generar_eventos_diarios() to postgres, service_role;

-- ─────────────────────────────────────────────
-- 5. Ranking con avatar y marca de "usuario actual"
--    (cambia el tipo de retorno, por eso DROP + CREATE)
-- ─────────────────────────────────────────────
drop function if exists public.obtener_ranking_colegio();

create function public.obtener_ranking_colegio()
returns table (
  nombre text,
  curso text,
  nivel int,
  xp int,
  avatar_id text,
  es_usuario_actual boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colegio_id uuid;
begin
  select colegio_id into v_colegio_id
  from public.perfiles
  where id = auth.uid() and rol = 'estudiante' and activo;
  if not found or v_colegio_id is null then return; end if;

  return query
  select p.nombre, p.curso, personaje.nivel, personaje.xp, p.avatar_id, (p.id = auth.uid())
  from public.perfiles p
  join public.personajes personaje on personaje.usuario_id = p.id
  where p.colegio_id = v_colegio_id
    and p.rol = 'estudiante'
    and p.activo
    and personaje.modo_juego = 'estudiante'
  order by personaje.xp desc, p.nombre
  limit 50;
end;
$$;

revoke all on function public.obtener_ranking_colegio() from public;
grant execute on function public.obtener_ranking_colegio() to authenticated;
