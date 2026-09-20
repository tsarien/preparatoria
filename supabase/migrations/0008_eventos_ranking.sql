-- preparatorIA — Fase 7: eventos aleatorios + ranking por colegio
-- Ejecuta este archivo en Supabase > SQL Editor (después de 0001-0007)

-- ─────────────────────────────────────────────
-- Tabla de eventos aleatorios
-- ─────────────────────────────────────────────

create table if not exists public.eventos_aleatorios (
  id uuid primary key default gen_random_uuid(),
  personaje_id uuid references public.personajes(id) not null,
  tipo text not null, -- factura_inesperada | imprevisto_medico | bono_inesperado | oferta_sospechosa
  descripcion text not null,
  impacto_monto numeric(12,2) not null,
  estado text not null default 'pendiente', -- pendiente | resuelto
  creado_en timestamptz not null default now(),
  resuelto_en timestamptz
);

alter table public.eventos_aleatorios enable row level security;

create policy "eventos: el usuario ve/edita solo los de su personaje" on public.eventos_aleatorios
  for all using (
    exists (select 1 from public.personajes where personajes.id = eventos_aleatorios.personaje_id and personajes.usuario_id = auth.uid())
  );

-- ─────────────────────────────────────────────
-- generar_eventos_diarios(): 0-2 eventos por personaje, con montos e historias
-- variadas. Pensada para correr una vez al día vía pg_cron (al final de este
-- archivo) — pero también la puedes llamar a mano para probar sin esperar un día:
--   select public.generar_eventos_diarios();
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
  -- MVP: trata a todos los personajes como "activos". Cuando exista un campo de
  -- último login en perfiles, esto se puede filtrar (ej. "where ultimo_login > now() - interval '7 days'").
  for v_personaje in select id from public.personajes loop
    v_num_eventos := floor(random() * 3)::int; -- 0, 1 o 2

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

-- ─────────────────────────────────────────────
-- resolver_evento(): atender el evento (reutiliza registrar_transaccion de la
-- Fase 2) o ignorarlo. Ignorar una "oferta sospechosa" es la jugada correcta —
-- ahí está la conexión con el módulo de detectar estafas de la Fase 4. Otorga
-- 5 XP por atender cualquier evento (reutiliza otorgar_xp).
-- ─────────────────────────────────────────────

create or replace function public.resolver_evento(
  p_evento_id uuid,
  p_accion text -- 'atender' | 'ignorar'
)
returns public.eventos_aleatorios
language plpgsql
security invoker
as $$
declare
  v_evento public.eventos_aleatorios;
  v_tipo_transaccion text;
begin
  select e.* into v_evento
  from public.eventos_aleatorios e
  join public.personajes p on p.id = e.personaje_id
  where e.id = p_evento_id and p.usuario_id = auth.uid()
  for update;

  if not found then
    raise exception 'evento no encontrado o no pertenece al usuario';
  end if;
  if v_evento.estado = 'resuelto' then
    raise exception 'este evento ya fue resuelto';
  end if;

  if p_accion = 'atender' then
    v_tipo_transaccion := case when v_evento.tipo = 'bono_inesperado' then 'ingreso' else 'gasto' end;
    -- permitir_negativo = true: un imprevisto real te puede dejar en números rojos,
    -- a diferencia de los retos de las Fases 3-6 donde todo se valida antes de enviar.
    perform public.registrar_transaccion(
      v_evento.personaje_id, v_tipo_transaccion, v_evento.impacto_monto,
      v_evento.tipo, v_evento.descripcion, 'evento:' || p_evento_id::text, true
    );
  elsif p_accion != 'ignorar' then
    raise exception 'accion invalida';
  end if;

  perform public.otorgar_xp(v_evento.personaje_id, 5);

  update public.eventos_aleatorios set estado = 'resuelto', resuelto_en = now()
  where id = p_evento_id
  returning * into v_evento;

  return v_evento;
end;
$$;

revoke all on function public.resolver_evento(uuid, text) from public;
grant execute on function public.resolver_evento(uuid, text) to authenticated;

-- ─────────────────────────────────────────────
-- Ranking por colegio: función security definer que expone SOLO lo necesario
-- (nombre, curso, nivel, xp) — nunca correo del acudiente, fecha de nacimiento,
-- ni estado de consentimiento. No es una policy de RLS ampliada a propósito:
-- una policy que dejara ver "todo el perfil de mis compañeros" filtraría esos
-- campos sensibles por la API de Supabase. Esta función controla exactamente
-- qué columnas salen, sin importar qué tan amplio sea el acceso a la fila.
-- ─────────────────────────────────────────────

create or replace function public.obtener_ranking_colegio()
returns table (nombre text, curso text, nivel int, xp int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colegio_id uuid;
begin
  select colegio_id into v_colegio_id from public.perfiles where id = auth.uid();
  if v_colegio_id is null then
    return;
  end if;

  return query
  select p.nombre, p.curso, per.nivel, per.xp
  from public.perfiles p
  join public.personajes per on per.usuario_id = p.id
  where p.colegio_id = v_colegio_id
  order by per.xp desc
  limit 50;
end;
$$;

revoke all on function public.obtener_ranking_colegio() from public;
grant execute on function public.obtener_ranking_colegio() to authenticated;

-- ─────────────────────────────────────────────
-- Cron: genera eventos todos los días a las 8:00am hora Colombia (13:00 UTC).
-- REQUIERE activar antes la extensión pg_cron: Dashboard > Database > Extensions
-- > buscar "pg_cron" > Enable. Si corres este archivo completo ANTES de activar
-- la extensión, todo lo de arriba queda creado igual — solo este último bloque
-- va a fallar; actívala y corre nada más este bloque de nuevo.
-- ─────────────────────────────────────────────

select cron.schedule(
  'generar-eventos-diarios',
  '0 13 * * *',
  $$ select public.generar_eventos_diarios(); $$
);
