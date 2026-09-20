-- preparatorIA — Fase 6: módulo "Ahorro con metas"
-- Ejecuta este archivo en Supabase > SQL Editor (después de 0001-0006)

-- ─────────────────────────────────────────────
-- Tabla: metas de ahorro (a diferencia de los retos anteriores, esto no es una
-- decisión de una sola vez — es un objetivo que el personaje va alimentando
-- con el tiempo, por eso vive en su propia tabla y no solo en progreso_usuario_reto)
-- ─────────────────────────────────────────────

create table if not exists public.metas_ahorro (
  id uuid primary key default gen_random_uuid(),
  personaje_id uuid references public.personajes(id) not null,
  nombre text not null,
  monto_objetivo numeric(12,2) not null,
  monto_actual numeric(12,2) not null default 0,
  aporte_mensual_planeado numeric(12,2) not null default 0,
  creado_en timestamptz not null default now()
);

alter table public.metas_ahorro enable row level security;

create policy "metas_ahorro: el usuario ve/edita solo las de su personaje" on public.metas_ahorro
  for all using (
    exists (select 1 from public.personajes where personajes.id = metas_ahorro.personaje_id and personajes.usuario_id = auth.uid())
  ) with check (
    exists (select 1 from public.personajes where personajes.id = metas_ahorro.personaje_id and personajes.usuario_id = auth.uid())
  );

-- ─────────────────────────────────────────────
-- aportar_a_meta: mueve plata del saldo disponible hacia una meta, de forma
-- atómica. NO duplica la lógica de la Fase 2 — llama a registrar_transaccion()
-- para el movimiento de billetera (valida saldo suficiente, actualiza el saldo),
-- y solo le suma encima la actualización de monto_actual en la misma transacción.
-- ─────────────────────────────────────────────

create or replace function public.aportar_a_meta(
  p_meta_id uuid,
  p_monto numeric
)
returns public.metas_ahorro
language plpgsql
security invoker
as $$
declare
  v_meta public.metas_ahorro;
begin
  if p_monto is null or p_monto <= 0 then
    raise exception 'monto debe ser mayor a cero';
  end if;

  select m.* into v_meta
  from public.metas_ahorro m
  join public.personajes p on p.id = m.personaje_id
  where m.id = p_meta_id and p.usuario_id = auth.uid();

  if not found then
    raise exception 'meta no encontrada o no pertenece al usuario';
  end if;

  perform public.registrar_transaccion(
    v_meta.personaje_id,
    'gasto',
    p_monto,
    'ahorro_meta',
    'Aporte a: ' || v_meta.nombre,
    'meta:' || p_meta_id::text,
    false
  );

  update public.metas_ahorro
  set monto_actual = monto_actual + p_monto
  where id = p_meta_id
  returning * into v_meta;

  return v_meta;
end;
$$;

revoke all on function public.aportar_a_meta(uuid, numeric) from public;
grant execute on function public.aportar_a_meta(uuid, numeric) to authenticated;

-- ─────────────────────────────────────────────
-- Seed: módulo + reto (MVP completo con este módulo)
-- ─────────────────────────────────────────────

insert into public.modulos (slug, grupo, nombre, descripcion, orden, estado)
values (
  'ahorro-metas',
  'dinero',
  'Ahorro con metas',
  'Define una meta de ahorro (como la cuota inicial de tu primer apartamento) y ve tu progreso mes a mes.',
  4,
  'mvp'
)
on conflict (slug) do nothing;

insert into public.retos (modulo_id, slug, nombre, tipo, dificultad, orden, config)
select id, 'meta-de-ahorro', 'Crea tu meta de ahorro', 'meta_ahorro', 'medio', 1, '{}'::jsonb
from public.modulos where slug = 'ahorro-metas'
on conflict (slug) do nothing;
