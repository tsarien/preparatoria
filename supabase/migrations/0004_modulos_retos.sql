-- preparatorIA — Fase 3: catálogo de módulos/retos + progreso del estudiante
-- Ejecuta este archivo en Supabase > SQL Editor (después de 0001, 0002 y 0003)

-- ─────────────────────────────────────────────
-- Tablas
-- ─────────────────────────────────────────────

create table if not exists public.modulos (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  grupo text not null, -- dinero | vida_independiente | vida_profesional | seguridad_digital
  nombre text not null,
  descripcion text,
  orden int not null default 0,
  estado text not null default 'roadmap' -- mvp | roadmap
);

create table if not exists public.retos (
  id uuid primary key default gen_random_uuid(),
  modulo_id uuid references public.modulos(id) not null,
  slug text unique not null,
  nombre text not null,
  tipo text not null, -- asignacion | seleccion_multiple | priorizacion | ...
  dificultad text not null default 'facil',
  config jsonb not null default '{}',
  orden int not null default 0
);

create table if not exists public.progreso_usuario_reto (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.perfiles(id) not null,
  reto_id uuid references public.retos(id) not null,
  estado text not null default 'no_iniciado', -- no_iniciado | en_progreso | completado
  intentos int not null default 0,
  puntaje int,
  feedback_ia jsonb,
  completado_en timestamptz,
  actualizado_en timestamptz not null default now(),
  unique (usuario_id, reto_id)
);

-- ─────────────────────────────────────────────
-- Row Level Security
-- El catálogo (modulos, retos) es de lectura pública. El progreso es privado.
-- ─────────────────────────────────────────────

alter table public.modulos enable row level security;
alter table public.retos enable row level security;
alter table public.progreso_usuario_reto enable row level security;

create policy "modulos: lectura pública" on public.modulos for select using (true);
create policy "retos: lectura pública" on public.retos for select using (true);

create policy "progreso: el usuario ve/edita solo su progreso" on public.progreso_usuario_reto
  for all using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

-- ─────────────────────────────────────────────
-- Seed: módulo "Presupuesto personal" (MVP) y sus 3 retos
-- ─────────────────────────────────────────────

insert into public.modulos (slug, grupo, nombre, descripcion, orden, estado)
values (
  'presupuesto-personal',
  'dinero',
  'Presupuesto personal',
  'Aprende a distribuir tu plata, detectar gastos hormiga y priorizar cuando no alcanza para todo.',
  1,
  'mvp'
)
on conflict (slug) do nothing;

insert into public.retos (modulo_id, slug, nombre, tipo, dificultad, orden, config)
select
  id,
  'distribuir-salario',
  'Distribuye tu primer salario',
  'asignacion',
  'facil',
  1,
  '{"categorias": ["Vivienda", "Comida", "Transporte", "Ahorro", "Ocio"]}'::jsonb
from public.modulos where slug = 'presupuesto-personal'
on conflict (slug) do nothing;

insert into public.retos (modulo_id, slug, nombre, tipo, dificultad, orden, config)
select
  id,
  'gastos-hormiga',
  'Detecta los gastos hormiga',
  'seleccion_multiple',
  'facil',
  2,
  '{
    "items": [
      {"id": "cafe", "nombre": "Café todos los días camino al colegio", "monto": 6000, "es_hormiga": true},
      {"id": "arriendo", "nombre": "Arriendo del apartamento", "monto": 600000, "es_hormiga": false},
      {"id": "suscripcion", "nombre": "Suscripción de streaming que casi no usas", "monto": 35000, "es_hormiga": true},
      {"id": "mercado", "nombre": "Mercado del mes", "monto": 250000, "es_hormiga": false},
      {"id": "gimnasio", "nombre": "Cuota del gimnasio al que fuiste 2 veces este mes", "monto": 80000, "es_hormiga": true},
      {"id": "servicios", "nombre": "Servicios públicos (luz, agua, internet)", "monto": 120000, "es_hormiga": false},
      {"id": "domicilios", "nombre": "Pedir domicilio casi todos los días en vez de cocinar", "monto": 90000, "es_hormiga": true},
      {"id": "transporte", "nombre": "Transporte para ir al colegio", "monto": 60000, "es_hormiga": false}
    ]
  }'::jsonb
from public.modulos where slug = 'presupuesto-personal'
on conflict (slug) do nothing;

insert into public.retos (modulo_id, slug, nombre, tipo, dificultad, orden, config)
select
  id,
  'priorizar-gastos',
  'Prioriza tus gastos',
  'priorizacion',
  'medio',
  3,
  '{
    "presupuesto": 150000,
    "items": [
      {"id": "zapatos", "nombre": "Zapatos nuevos", "monto": 80000},
      {"id": "salida", "nombre": "Salida con amigos", "monto": 50000},
      {"id": "curso", "nombre": "Curso online que te interesa", "monto": 60000},
      {"id": "audifonos", "nombre": "Audífonos nuevos", "monto": 70000},
      {"id": "ahorro", "nombre": "Guardarlo para una emergencia", "monto": 40000}
    ]
  }'::jsonb
from public.modulos where slug = 'presupuesto-personal'
on conflict (slug) do nothing;
