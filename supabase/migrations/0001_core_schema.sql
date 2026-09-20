-- preparatorIA — Fase 0: esquema núcleo
-- Ejecuta este archivo completo en Supabase > SQL Editor > New query > Run

-- ─────────────────────────────────────────────
-- Tablas
-- ─────────────────────────────────────────────

create table if not exists public.colegios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  ciudad text,
  codigo_institucional text unique
);

create table if not exists public.perfiles (
  id uuid references auth.users(id) primary key,
  nombre text not null,
  fecha_nacimiento date,
  colegio_id uuid references public.colegios(id),
  curso text,
  rol text not null default 'estudiante',
  correo_acudiente text,
  consentimiento_acudiente text not null default 'pendiente', -- pendiente | aprobado
  creado_en timestamptz not null default now()
);

create table if not exists public.personajes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.perfiles(id) unique not null,
  saldo_billetera numeric(12,2) not null default 0,
  salario_mensual numeric(12,2) not null default 0,
  nivel int not null default 1,
  xp int not null default 0,
  creado_en timestamptz not null default now()
);

create table if not exists public.transacciones (
  id uuid primary key default gen_random_uuid(),
  personaje_id uuid references public.personajes(id) not null,
  tipo text not null check (tipo in ('ingreso', 'gasto')),
  categoria text,
  monto numeric(12,2) not null,
  descripcion text,
  origen text, -- ej: 'reto:presupuesto-01' o 'evento:factura'
  creado_en timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- Row Level Security
-- Cada estudiante solo puede leer/escribir SUS propios datos.
-- `colegios` es de lectura pública (se necesita para mostrar el selector al registrarse).
-- ─────────────────────────────────────────────

alter table public.colegios enable row level security;
alter table public.perfiles enable row level security;
alter table public.personajes enable row level security;
alter table public.transacciones enable row level security;

create policy "colegios: lectura pública" on public.colegios
  for select using (true);

create policy "perfiles: el usuario ve/edita solo su perfil" on public.perfiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "personajes: el usuario ve/edita solo su personaje" on public.personajes
  for all using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

create policy "transacciones: el usuario ve/edita solo las de su personaje" on public.transacciones
  for all using (
    exists (
      select 1 from public.personajes
      where personajes.id = transacciones.personaje_id
      and personajes.usuario_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- Dato de ejemplo — para que el "hola mundo" de la Fase 0 muestre algo real
-- ─────────────────────────────────────────────

insert into public.colegios (nombre, ciudad, codigo_institucional)
values ('Colegio de prueba', 'Medellín', 'DEMO-001')
on conflict (codigo_institucional) do nothing;
