-- preparatorIA — Fase 8: cumplimiento (consentimiento real del acudiente) + corrección de RLS
-- Ejecuta este archivo en Supabase > SQL Editor (después de 0001-0008)

-- ─────────────────────────────────────────────
-- CORRECCIÓN: a "colegios" le faltaba una política de inserción. Con RLS
-- activado, cualquier comando sin política explícita queda denegado por
-- defecto — la tabla solo tenía una policy de SELECT (lectura pública), así
-- que crear un colegio nuevo durante el registro (cuando el estudiante escribe
-- uno que todavía no existe) fallaba silenciosamente contra la base de datos
-- real. Esto no se veía en `next build` porque el build no habla con una base
-- de datos real — es exactamente el tipo de cosa que esta revisión de RLS de
-- la Fase 8 está pensada para atrapar.
-- ─────────────────────────────────────────────

create policy "colegios: cualquiera puede registrar uno nuevo" on public.colegios
  for insert with check (true);

-- ─────────────────────────────────────────────
-- Solicitudes de consentimiento del acudiente
-- ─────────────────────────────────────────────

create table if not exists public.solicitudes_consentimiento (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid references public.perfiles(id) not null,
  token uuid not null default gen_random_uuid(),
  estado text not null default 'pendiente', -- pendiente | aprobado | rechazado
  creado_en timestamptz not null default now(),
  resuelto_en timestamptz
);

create unique index if not exists solicitudes_consentimiento_token_idx on public.solicitudes_consentimiento (token);

alter table public.solicitudes_consentimiento enable row level security;

-- El estudiante puede ver el estado de SU solicitud (para mostrarla en el dashboard).
-- Nadie más puede leer esta tabla por RLS normal — el acudiente entra por el token,
-- no con una sesión, así que su acceso pasa por resolver_consentimiento() más abajo,
-- no por una policy.
create policy "solicitudes: el estudiante ve la suya" on public.solicitudes_consentimiento
  for select using (auth.uid() = perfil_id);

-- ─────────────────────────────────────────────
-- Actualiza el trigger de registro (Fase 1) para que también cree la
-- solicitud de consentimiento cuando el nuevo usuario es menor de edad.
-- Se reemplaza la función completa en vez de "parchar" la de la Fase 1 — así
-- es como se modifican triggers ya aplicados sin editar una migración vieja.
-- ─────────────────────────────────────────────

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

  insert into public.personajes (usuario_id, saldo_billetera, salario_mensual, nivel, xp)
  values (new.id, 0, 1200000, 1, 0);

  if v_es_menor then
    insert into public.solicitudes_consentimiento (perfil_id) values (new.id);
  end if;

  return new;
end;
$$;

-- ─────────────────────────────────────────────
-- resolver_consentimiento: el acudiente NO tiene sesión en la app — entra por
-- un link con el token, así que esta función se autentica con el token mismo
-- en vez de con auth.uid(). Por eso se le da permiso a "anon" además de
-- "authenticated" — es la única función de todo el proyecto con ese permiso,
-- y es una decisión deliberada, no un descuido.
-- ─────────────────────────────────────────────

-- Lectura pública por token (para mostrar la solicitud ANTES de que el acudiente
-- decida). Mismo motivo que resolver_consentimiento: sin esto, RLS le bloquearía
-- la lectura de "perfiles" porque no tiene sesión de ningún estudiante.
create or replace function public.obtener_solicitud_consentimiento(p_token uuid)
returns table (nombre_estudiante text, estado text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select p.nombre, s.estado
  from public.solicitudes_consentimiento s
  join public.perfiles p on p.id = s.perfil_id
  where s.token = p_token;
end;
$$;

revoke all on function public.obtener_solicitud_consentimiento(uuid) from public;
grant execute on function public.obtener_solicitud_consentimiento(uuid) to anon, authenticated;

create or replace function public.resolver_consentimiento(p_token uuid, p_aprobar boolean)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_solicitud public.solicitudes_consentimiento;
begin
  select * into v_solicitud
  from public.solicitudes_consentimiento
  where token = p_token
  for update;

  if not found then
    raise exception 'Este enlace no es válido.';
  end if;
  if v_solicitud.estado != 'pendiente' then
    raise exception 'Esta solicitud ya fue resuelta anteriormente.';
  end if;

  update public.solicitudes_consentimiento
  set estado = case when p_aprobar then 'aprobado' else 'rechazado' end,
      resuelto_en = now()
  where id = v_solicitud.id;

  update public.perfiles
  set consentimiento_acudiente = case when p_aprobar then 'aprobado' else 'rechazado' end
  where id = v_solicitud.perfil_id;

  return case when p_aprobar then 'aprobado' else 'rechazado' end;
end;
$$;

revoke all on function public.resolver_consentimiento(uuid, boolean) from public;
grant execute on function public.resolver_consentimiento(uuid, boolean) to anon, authenticated;

-- ─────────────────────────────────────────────
-- Auditoría rápida: corre esto para confirmar que RLS está activo en TODAS
-- las tablas de la app (debería devolver "true" en cada fila).
-- ─────────────────────────────────────────────

-- select tablename, rowsecurity from pg_tables where schemaname = 'public' order by tablename;
