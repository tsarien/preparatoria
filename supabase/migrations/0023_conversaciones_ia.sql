-- preparatorIA — 0023: conversaciones persistentes de IA (Guía global y IA educativa).
--
-- QUÉ HACE
--   1. conversaciones_ia: una fila por conversación (tipo 'guia' | 'educativa'), con título.
--   2. mensajes_ia_guia GANA conversacion_id (se extiende la tabla existente, no se duplica).
--      Los mensajes previos se agrupan en una conversación "Conversación anterior" por usuario.
--   3. mensajes_ia_educativa: historial SEPARADO del educador (educador_id, conversacion_id, autor, texto).
--   4. RLS: cada persona ve y gestiona solo lo suyo. El historial educativo solo lo pueden usar
--      cuentas con rol 'educador' activas; el estudiante nunca lo ve.

create table if not exists public.conversaciones_ia (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfiles(id) on delete cascade,
  tipo text not null check (tipo in ('guia', 'educativa')),
  titulo text not null default 'Nueva conversación' check (length(titulo) between 1 and 80),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists conversaciones_ia_perfil_idx
  on public.conversaciones_ia (perfil_id, tipo, actualizado_en desc);

alter table public.conversaciones_ia enable row level security;
drop policy if exists "conversaciones_ia: el usuario gestiona las suyas" on public.conversaciones_ia;
create policy "conversaciones_ia: el usuario gestiona las suyas"
  on public.conversaciones_ia for all
  using (perfil_id = auth.uid())
  with check (
    perfil_id = auth.uid()
    and (tipo = 'guia' or exists (
      select 1 from public.perfiles where id = auth.uid() and rol = 'educador' and activo))
  );

revoke all on public.conversaciones_ia from anon, authenticated;
grant select, insert, update, delete on public.conversaciones_ia to authenticated;
grant all on public.conversaciones_ia to service_role;

-- mensajes_ia_guia: conversación + autor 'guia' | 'estudiante' (se mantiene para educadores que usan la guía general)
alter table public.mensajes_ia_guia
  add column if not exists conversacion_id uuid references public.conversaciones_ia(id) on delete cascade;

create index if not exists mensajes_ia_guia_conversacion_idx
  on public.mensajes_ia_guia (conversacion_id, creado_en);

-- Backfill: una conversación por usuario con mensajes antiguos.
with usuarios as (
  select perfil_id, min(creado_en) as primero, max(creado_en) as ultimo
  from public.mensajes_ia_guia
  where conversacion_id is null
  group by perfil_id
), nuevas as (
  insert into public.conversaciones_ia (perfil_id, tipo, titulo, creado_en, actualizado_en)
  select perfil_id, 'guia', 'Conversación anterior', primero, ultimo from usuarios
  returning id, perfil_id
)
update public.mensajes_ia_guia m
set conversacion_id = n.id
from nuevas n
where m.perfil_id = n.perfil_id and m.conversacion_id is null;

-- Que la conversación pertenezca a quien escribe el mensaje
drop policy if exists "mensajes_ia_guia: el usuario ve/gestiona solo los suyos" on public.mensajes_ia_guia;
drop policy if exists "mensajes_ia_guia: solo en conversaciones propias" on public.mensajes_ia_guia;
create policy "mensajes_ia_guia: solo en conversaciones propias"
  on public.mensajes_ia_guia for all
  using (auth.uid() = perfil_id)
  with check (
    auth.uid() = perfil_id
    and (conversacion_id is null or exists (
      select 1 from public.conversaciones_ia c
      where c.id = conversacion_id and c.perfil_id = auth.uid() and c.tipo = 'guia'))
  );

create table if not exists public.mensajes_ia_educativa (
  id uuid primary key default gen_random_uuid(),
  educador_id uuid not null references public.perfiles(id) on delete cascade,
  conversacion_id uuid not null references public.conversaciones_ia(id) on delete cascade,
  autor text not null check (autor in ('educador', 'ia')),
  texto text not null check (length(texto) between 1 and 6000),
  contexto jsonb,
  creado_en timestamptz not null default now()
);

create index if not exists mensajes_ia_educativa_conv_idx
  on public.mensajes_ia_educativa (conversacion_id, creado_en);

alter table public.mensajes_ia_educativa enable row level security;
drop policy if exists "mensajes_ia_educativa: el educador gestiona los suyos" on public.mensajes_ia_educativa;
create policy "mensajes_ia_educativa: el educador gestiona los suyos"
  on public.mensajes_ia_educativa for all
  using (
    educador_id = auth.uid()
    and exists (select 1 from public.perfiles where id = auth.uid() and rol = 'educador' and activo)
  )
  with check (
    educador_id = auth.uid()
    and exists (select 1 from public.perfiles where id = auth.uid() and rol = 'educador' and activo)
    and exists (
      select 1 from public.conversaciones_ia c
      where c.id = conversacion_id and c.perfil_id = auth.uid() and c.tipo = 'educativa')
  );

revoke all on public.mensajes_ia_educativa from anon, authenticated;
grant select, insert, delete on public.mensajes_ia_educativa to authenticated;
grant all on public.mensajes_ia_educativa to service_role;
