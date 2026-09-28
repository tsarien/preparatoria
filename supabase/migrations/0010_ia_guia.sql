-- preparatorIA — IA Guía: historial de conversación
-- Ejecuta este archivo en Supabase > SQL Editor (después de 0001-0009)

create table if not exists public.mensajes_ia_guia (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid references public.perfiles(id) not null,
  autor text not null check (autor in ('guia', 'estudiante')),
  texto text not null check (length(texto) between 1 and 2000),
  creado_en timestamptz not null default now()
);

create index if not exists mensajes_ia_guia_perfil_creado_idx
  on public.mensajes_ia_guia (perfil_id, creado_en desc);

alter table public.mensajes_ia_guia enable row level security;

create policy "mensajes_ia_guia: el usuario ve/gestiona solo los suyos"
  on public.mensajes_ia_guia
  for all
  using (auth.uid() = perfil_id)
  with check (auth.uid() = perfil_id);