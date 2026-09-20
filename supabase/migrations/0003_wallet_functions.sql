-- preparatorIA — Fase 2: motor de billetera virtual y gamificación
-- Ejecuta este archivo en Supabase > SQL Editor (después de 0001 y 0002)

-- ─────────────────────────────────────────────
-- registrar_transaccion
-- Inserta la transacción y actualiza el saldo en una sola operación atómica.
-- No se puede llamar "saldo = saldo - monto" desde el cliente y esperar que
-- quede bien: si dos pestañas gastan al tiempo, una pisa a la otra (race
-- condition). Aquí el UPDATE sale directo de la fila actual en la misma
-- transacción de Postgres, así que no hay ventana para eso.
-- ─────────────────────────────────────────────

create or replace function public.registrar_transaccion(
  p_personaje_id uuid,
  p_tipo text,
  p_monto numeric,
  p_categoria text default null,
  p_descripcion text default null,
  p_origen text default null,
  p_permitir_negativo boolean default false
)
returns public.personajes
language plpgsql
security invoker
as $$
declare
  v_personaje public.personajes;
  v_delta numeric;
begin
  if p_tipo not in ('ingreso', 'gasto') then
    raise exception 'tipo debe ser ingreso o gasto';
  end if;
  if p_monto is null or p_monto <= 0 then
    raise exception 'monto debe ser mayor a cero';
  end if;

  -- select ... for update: bloquea la fila hasta que termine esta transacción,
  -- para que dos llamadas simultáneas no lean el mismo saldo "viejo".
  select * into v_personaje
  from public.personajes
  where id = p_personaje_id and usuario_id = auth.uid()
  for update;

  if not found then
    raise exception 'personaje no encontrado o no pertenece al usuario';
  end if;

  v_delta := case when p_tipo = 'ingreso' then p_monto else -p_monto end;

  if p_tipo = 'gasto' and not p_permitir_negativo
     and (v_personaje.saldo_billetera + v_delta) < 0 then
    raise exception 'saldo insuficiente';
  end if;

  insert into public.transacciones (personaje_id, tipo, categoria, monto, descripcion, origen)
  values (p_personaje_id, p_tipo, p_categoria, p_monto, p_descripcion, p_origen);

  update public.personajes
  set saldo_billetera = saldo_billetera + v_delta
  where id = p_personaje_id
  returning * into v_personaje;

  return v_personaje;
end;
$$;

-- ─────────────────────────────────────────────
-- otorgar_xp
-- Suma XP y recalcula el nivel en la misma operación.
-- Fórmula: nivel = floor(xp_total / 500) + 1  — igual a lib/gamification.ts,
-- pero esta es la que de verdad manda.
-- ─────────────────────────────────────────────

create or replace function public.otorgar_xp(
  p_personaje_id uuid,
  p_cantidad int
)
returns public.personajes
language plpgsql
security invoker
as $$
declare
  v_personaje public.personajes;
  v_xp_nuevo int;
begin
  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'cantidad debe ser mayor a cero';
  end if;

  select * into v_personaje
  from public.personajes
  where id = p_personaje_id and usuario_id = auth.uid()
  for update;

  if not found then
    raise exception 'personaje no encontrado o no pertenece al usuario';
  end if;

  v_xp_nuevo := v_personaje.xp + p_cantidad;

  update public.personajes
  set xp = v_xp_nuevo,
      nivel = floor(v_xp_nuevo / 500.0) + 1
  where id = p_personaje_id
  returning * into v_personaje;

  return v_personaje;
end;
$$;

-- ─────────────────────────────────────────────
-- Permisos: solo usuarios autenticados pueden llamar estas funciones
-- (no anon, no public). security invoker hace que, además, corran con los
-- permisos del usuario que llama — por eso siguen respetando RLS.
-- ─────────────────────────────────────────────

revoke all on function public.registrar_transaccion(uuid, text, numeric, text, text, text, boolean) from public;
grant execute on function public.registrar_transaccion(uuid, text, numeric, text, text, text, boolean) to authenticated;

revoke all on function public.otorgar_xp(uuid, int) from public;
grant execute on function public.otorgar_xp(uuid, int) to authenticated;
