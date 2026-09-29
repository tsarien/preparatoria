-- Las mutaciones financieras se realizan mediante funciones que verifican auth.uid().

drop policy if exists "personajes: el usuario ve/edita solo su personaje" on public.personajes;
create policy "personajes: lectura del propio personaje"
  on public.personajes for select using (auth.uid() = usuario_id);
revoke insert, update, delete on public.personajes from authenticated;

drop policy if exists "transacciones: el usuario ve/edita solo las de su personaje" on public.transacciones;
create policy "transacciones: lectura de las propias"
  on public.transacciones for select using (
    exists (
      select 1 from public.personajes
      where personajes.id = transacciones.personaje_id
        and personajes.usuario_id = auth.uid()
    )
  );
revoke insert, update, delete on public.transacciones from authenticated;

drop policy if exists "eventos: el usuario ve/edita solo los de su personaje" on public.eventos_aleatorios;
create policy "eventos: lectura de los propios"
  on public.eventos_aleatorios for select using (
    exists (
      select 1 from public.personajes
      where personajes.id = eventos_aleatorios.personaje_id
        and personajes.usuario_id = auth.uid()
    )
  );
revoke insert, update, delete on public.eventos_aleatorios from authenticated;

drop policy if exists "metas_ahorro: el usuario ve/edita solo las de su personaje" on public.metas_ahorro;
create policy "metas_ahorro: lectura del propio personaje"
  on public.metas_ahorro for select using (
    exists (
      select 1 from public.personajes
      where personajes.id = metas_ahorro.personaje_id
        and personajes.usuario_id = auth.uid()
    )
  );
revoke insert, update, delete on public.metas_ahorro from authenticated;

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
security definer
set search_path = public
as $$
declare
  v_personaje public.personajes;
  v_delta numeric;
begin
  if auth.uid() is null or p_tipo not in ('ingreso', 'gasto')
     or p_monto is null or p_monto <= 0 then
    raise exception 'Transacción inválida.';
  end if;

  select * into v_personaje
  from public.personajes
  where id = p_personaje_id and usuario_id = auth.uid()
  for update;
  if not found then raise exception 'Personaje no encontrado.'; end if;

  v_delta := case when p_tipo = 'ingreso' then p_monto else -p_monto end;
  if p_tipo = 'gasto' and not p_permitir_negativo
     and v_personaje.saldo_billetera + v_delta < 0 then
    raise exception 'Saldo insuficiente.';
  end if;

  insert into public.transacciones (personaje_id, tipo, categoria, monto, descripcion, origen)
  values (p_personaje_id, p_tipo, p_categoria, p_monto, p_descripcion, p_origen);
  update public.personajes
  set saldo_billetera = saldo_billetera + v_delta
  where id = p_personaje_id returning * into v_personaje;
  return v_personaje;
end;
$$;

create or replace function public.otorgar_xp(p_personaje_id uuid, p_cantidad int)
returns public.personajes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_personaje public.personajes;
  v_xp_nuevo int;
begin
  if auth.uid() is null or p_cantidad is null or p_cantidad <= 0 then
    raise exception 'Cantidad de XP inválida.';
  end if;
  select * into v_personaje
  from public.personajes
  where id = p_personaje_id and usuario_id = auth.uid()
  for update;
  if not found then raise exception 'Personaje no encontrado.'; end if;

  v_xp_nuevo := v_personaje.xp + p_cantidad;
  update public.personajes
  set xp = v_xp_nuevo, nivel = floor(v_xp_nuevo / 500.0) + 1
  where id = p_personaje_id returning * into v_personaje;
  return v_personaje;
end;
$$;

create or replace function public.crear_meta_ahorro(
  p_nombre text,
  p_monto_objetivo numeric,
  p_aporte_mensual numeric
)
returns public.metas_ahorro
language plpgsql
security definer
set search_path = public
as $$
declare
  v_personaje_id uuid;
  v_meta public.metas_ahorro;
begin
  if auth.uid() is null or length(trim(p_nombre)) not between 1 and 80
     or p_monto_objetivo is null or p_monto_objetivo <= 0
     or p_aporte_mensual is null or p_aporte_mensual <= 0 then
    raise exception 'Datos de meta inválidos.';
  end if;

  select id into v_personaje_id
  from public.personajes where usuario_id = auth.uid();
  if not found then raise exception 'Personaje no encontrado.'; end if;
  if exists (select 1 from public.metas_ahorro where personaje_id = v_personaje_id) then
    raise exception 'Ya existe una meta activa.';
  end if;

  insert into public.metas_ahorro (
    personaje_id, nombre, monto_objetivo, aporte_mensual_planeado
  )
  values (v_personaje_id, trim(p_nombre), p_monto_objetivo, p_aporte_mensual)
  returning * into v_meta;
  return v_meta;
end;
$$;

create or replace function public.aportar_a_meta(p_meta_id uuid, p_monto numeric)
returns public.metas_ahorro
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta public.metas_ahorro;
begin
  if auth.uid() is null or p_monto is null or p_monto <= 0 then
    raise exception 'Aporte inválido.';
  end if;
  select metas_ahorro.* into v_meta
  from public.metas_ahorro
  join public.personajes on personajes.id = metas_ahorro.personaje_id
  where metas_ahorro.id = p_meta_id and personajes.usuario_id = auth.uid()
  for update of metas_ahorro;
  if not found then raise exception 'Meta no encontrada.'; end if;

  perform public.registrar_transaccion(
    v_meta.personaje_id, 'gasto', p_monto, 'ahorro_meta',
    'Aporte a: ' || v_meta.nombre, 'meta:' || p_meta_id::text, false
  );
  update public.metas_ahorro
  set monto_actual = monto_actual + p_monto
  where id = p_meta_id returning * into v_meta;
  return v_meta;
end;
$$;

create or replace function public.resolver_evento(p_evento_id uuid, p_accion text)
returns public.eventos_aleatorios
language plpgsql
security definer
set search_path = public
as $$
declare
  v_evento public.eventos_aleatorios;
  v_tipo_transaccion text;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
  select eventos_aleatorios.* into v_evento
  from public.eventos_aleatorios
  join public.personajes on personajes.id = eventos_aleatorios.personaje_id
  where eventos_aleatorios.id = p_evento_id
    and personajes.usuario_id = auth.uid()
  for update of eventos_aleatorios;
  if not found then raise exception 'Evento no encontrado.'; end if;
  if v_evento.estado = 'resuelto' then raise exception 'Evento ya resuelto.'; end if;

  if p_accion = 'atender' then
    v_tipo_transaccion := case when v_evento.tipo = 'bono_inesperado' then 'ingreso' else 'gasto' end;
    perform public.registrar_transaccion(
      v_evento.personaje_id, v_tipo_transaccion, v_evento.impacto_monto,
      v_evento.tipo, v_evento.descripcion, 'evento:' || p_evento_id::text, true
    );
  elsif p_accion <> 'ignorar' then
    raise exception 'Acción inválida.';
  end if;
  perform public.otorgar_xp(v_evento.personaje_id, 5);
  update public.eventos_aleatorios
  set estado = 'resuelto', resuelto_en = now()
  where id = p_evento_id returning * into v_evento;
  return v_evento;
end;
$$;

revoke all on function public.registrar_transaccion(uuid, text, numeric, text, text, text, boolean) from public;
grant execute on function public.registrar_transaccion(uuid, text, numeric, text, text, text, boolean) to authenticated;
revoke all on function public.otorgar_xp(uuid, int) from public;
grant execute on function public.otorgar_xp(uuid, int) to authenticated;
revoke all on function public.crear_meta_ahorro(text, numeric, numeric) from public;
grant execute on function public.crear_meta_ahorro(text, numeric, numeric) to authenticated;
revoke all on function public.aportar_a_meta(uuid, numeric) from public;
grant execute on function public.aportar_a_meta(uuid, numeric) to authenticated;
revoke all on function public.resolver_evento(uuid, text) from public;
grant execute on function public.resolver_evento(uuid, text) to authenticated;