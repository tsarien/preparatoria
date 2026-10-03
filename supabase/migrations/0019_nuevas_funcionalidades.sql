-- preparatorIA — Fase 3, 9, 10: Cursos, Admin, Tickets, Historial IA Educativa

-- 1. Cursos del colegio
create table if not exists public.cursos_colegio (
  id uuid primary key default gen_random_uuid(),
  colegio_id uuid references public.colegios(id) on delete cascade not null,
  nombre text not null,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create index idx_cursos_colegio_colegio on public.cursos_colegio(colegio_id);

alter table public.cursos_colegio enable row level security;

-- Lectura pública o para usuarios autenticados
create policy "cursos_colegio: lectura pública" on public.cursos_colegio
  for select using (true);


-- 2. Estado activo en colegios (si no existe)
do $$ 
begin
  if not exists (select 1 from information_schema.columns where table_name = 'colegios' and column_name = 'activo') then
    alter table public.colegios add column activo boolean not null default true;
  end if;
end $$;


-- 3. Soporte / Tickets
create table if not exists public.tickets_soporte (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references auth.users(id) not null,
  colegio_id uuid references public.colegios(id),
  asunto text not null,
  categoria text not null,
  descripcion text not null,
  estado text not null default 'abierto' check (estado in ('abierto', 'en_proceso', 'respondido', 'cerrado')),
  prioridad text default 'normal',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  cerrado_en timestamptz,
  asignado_a uuid references auth.users(id)
);

create table if not exists public.ticket_mensajes (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references public.tickets_soporte(id) on delete cascade not null,
  autor_id uuid references auth.users(id) not null,
  mensaje text not null,
  creado_en timestamptz not null default now()
);

alter table public.tickets_soporte enable row level security;
alter table public.ticket_mensajes enable row level security;

-- RLS Tickets: usuario ve los suyos.
create policy "tickets: usuario ve sus propios tickets" on public.tickets_soporte
  for select using (auth.uid() = usuario_id);
create policy "tickets: usuario crea tickets" on public.tickets_soporte
  for insert with check (auth.uid() = usuario_id);

create policy "ticket_mensajes: usuario ve mensajes de sus tickets" on public.ticket_mensajes
  for select using (
    exists (
      select 1 from public.tickets_soporte
      where id = ticket_id and usuario_id = auth.uid()
    )
  );
create policy "ticket_mensajes: usuario crea mensajes en sus tickets" on public.ticket_mensajes
  for insert with check (auth.uid() = autor_id and exists (
      select 1 from public.tickets_soporte
      where id = ticket_id and usuario_id = auth.uid()
    ));

-- 4. Historial IA Educativa
create table if not exists public.mensajes_ia_educativa (
  id uuid primary key default gen_random_uuid(),
  educador_id uuid references auth.users(id) not null,
  autor text not null check (autor in ('usuario', 'ia')),
  texto text not null,
  creado_en timestamptz not null default now()
);

alter table public.mensajes_ia_educativa enable row level security;

create policy "mensajes_ia_educativa: educador gestiona sus mensajes" on public.mensajes_ia_educativa
  for all using (auth.uid() = educador_id) with check (auth.uid() = educador_id);
