-- preparatorIA — instalación completa (generado; NO editar a mano)
-- Regenerar con: node scripts/build-setup-sql.mjs
-- Contiene 17 migraciones en orden. Úsalo en una base vacía (ver supabase/reset_public.sql).

-- ════════════════════════════════════════════════════════════
-- 0001_core_schema.sql
-- ════════════════════════════════════════════════════════════
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

-- ════════════════════════════════════════════════════════════
-- 0002_auth_perfil_trigger.sql
-- ════════════════════════════════════════════════════════════
-- preparatorIA — Fase 1: creación automática de perfil + personaje al registrarse
-- Ejecuta este archivo en Supabase > SQL Editor (después de 0001_core_schema.sql)

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

  -- "Mi Vida Simulada" arranca con un salario base simulado, no en cero.
  insert into public.personajes (usuario_id, saldo_billetera, salario_mensual, nivel, xp)
  values (new.id, 0, 1200000, 1, 0);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ════════════════════════════════════════════════════════════
-- 0003_wallet_functions.sql
-- ════════════════════════════════════════════════════════════
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

-- ════════════════════════════════════════════════════════════
-- 0004_modulos_retos.sql
-- ════════════════════════════════════════════════════════════
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

-- ════════════════════════════════════════════════════════════
-- 0005_modulo_estafas.sql
-- ════════════════════════════════════════════════════════════
-- preparatorIA — Fase 4: módulo "Detectar estafas"
-- Ejecuta este archivo en Supabase > SQL Editor (después de 0001-0004)

insert into public.modulos (slug, grupo, nombre, descripcion, orden, estado)
values (
  'detectar-estafas',
  'seguridad_digital',
  'Detectar estafas',
  'Practica con mensajes, correos e "inversiones" — algunos son estafas reales, otros no. Aprende a distinguirlos.',
  2,
  'mvp'
)
on conflict (slug) do nothing;

-- 1. Premio sospechoso (SMS) — ESTAFA
insert into public.retos (modulo_id, slug, nombre, tipo, dificultad, orden, config)
select id, 'premio-sospechoso', 'Te ganaste un premio', 'deteccion_estafa', 'facil', 1,
'{
  "canal": "sms",
  "remitente": "+57 300 XXX XXXX",
  "mensaje_inicial": "¡Felicidades! 🎉 Fuiste seleccionado para reclamar un iPhone 17 GRATIS. Solo debes pagar $45.000 de envío aquí: bit.ly/premio-ya. Tienes 30 minutos antes de perder el premio.",
  "es_estafa": true,
  "monto_en_riesgo": 45000,
  "senales_clave": [
    "Un premio de un sorteo en el que nunca participaste",
    "Te piden pagar plata para reclamar algo \"gratis\"",
    "Link acortado y desconocido",
    "Presión de tiempo (30 minutos)"
  ],
  "interactivo": true,
  "descripcion_personaje": "Alguien que te escribe por SMS avisando que ganaste un premio, y presiona para que pagues un \"envío\" rápido antes de que se acabe el tiempo."
}'::jsonb
from public.modulos where slug = 'detectar-estafas'
on conflict (slug) do nothing;

-- 2. Correo de banco falso — ESTAFA (phishing)
insert into public.retos (modulo_id, slug, nombre, tipo, dificultad, orden, config)
select id, 'correo-banco-falso', 'Tu cuenta bancaria', 'deteccion_estafa', 'medio', 2,
'{
  "canal": "correo",
  "remitente": "seguridad@bancolomb-verificacion.com",
  "mensaje_inicial": "Estimado cliente, detectamos actividad inusual en su cuenta. Para evitar el bloqueo, verifique sus datos en el siguiente enlace dentro de las próximas 24 horas: verificacion-bancolombia-segura.com/login",
  "es_estafa": true,
  "monto_en_riesgo": 300000,
  "senales_clave": [
    "El dominio del correo no es el del banco real",
    "Urgencia y amenaza de bloqueo",
    "Piden \"verificar\" la clave en un link — un banco real nunca hace esto",
    "Saludo genérico (\"Estimado cliente\") en vez de tu nombre"
  ],
  "interactivo": true,
  "descripcion_personaje": "Alguien haciéndose pasar por \"seguridad\" de un banco, insistiendo en que hay un problema urgente con tu cuenta y presionando para que entres a un link y pongas tu clave."
}'::jsonb
from public.modulos where slug = 'detectar-estafas'
on conflict (slug) do nothing;

-- 3. "Triplica tu plata" — ESTAFA (esquema de inversión)
insert into public.retos (modulo_id, slug, nombre, tipo, dificultad, orden, config)
select id, 'invierte-triplica', 'Triplica tu plata', 'deteccion_estafa', 'medio', 3,
'{
  "canal": "mensaje",
  "remitente": "Grupo de WhatsApp \"Inversiones Fáciles 💰\"",
  "mensaje_inicial": "Parce, únete a nuestro grupo de inversión. En 1 semana triplicas lo que pongas, ya varios del colegio están ganando plata. Solo necesitas empezar con $200.000. ¿Te metes?",
  "es_estafa": true,
  "monto_en_riesgo": 200000,
  "senales_clave": [
    "Promesa de ganancia garantizada y rápida — nadie puede prometer eso",
    "Presión social (\"ya varios del colegio están ganando\")",
    "Nunca explican en qué invierten realmente",
    "Te empujan a poner dinero ya mismo"
  ],
  "interactivo": true,
  "descripcion_personaje": "Un conocido del colegio que te invita a un \"grupo de inversión\" prometiendo triplicar tu plata rápido, usando presión social para que te metas ya."
}'::jsonb
from public.modulos where slug = 'detectar-estafas'
on conflict (slug) do nothing;

-- 4. Aviso del colegio — LEGÍTIMO (no todo es estafa)
insert into public.retos (modulo_id, slug, nombre, tipo, dificultad, orden, config)
select id, 'correo-colegio', 'Aviso del colegio', 'deteccion_estafa', 'facil', 4,
'{
  "canal": "correo",
  "remitente": "coordinacion@tucolegio.edu.co",
  "mensaje_inicial": "Recordatorio: mañana martes hay reunión de padres de familia a las 6:00pm en el auditorio principal. No se requiere confirmar asistencia. Cualquier duda, comunícate en horario escolar.",
  "es_estafa": false,
  "monto_en_riesgo": null,
  "senales_clave": [
    "El dominio del correo es el del colegio real",
    "No pide dinero ni datos personales",
    "No genera urgencia ni presión",
    "Es información que puedes verificar directamente con el colegio"
  ],
  "interactivo": false,
  "descripcion_personaje": null
}'::jsonb
from public.modulos where slug = 'detectar-estafas'
on conflict (slug) do nothing;

-- ════════════════════════════════════════════════════════════
-- 0006_modulo_contrato.sql
-- ════════════════════════════════════════════════════════════
-- preparatorIA — Fase 5: módulo "Contrato de arriendo"
-- Ejecuta este archivo en Supabase > SQL Editor (después de 0001-0005)

insert into public.modulos (slug, grupo, nombre, descripcion, orden, estado)
values (
  'contrato-arriendo',
  'vida_independiente',
  'Contrato de arriendo',
  'Lee un contrato de arriendo real (ficticio, pero realista), detecta cláusulas abusivas, y practica negociar con el arrendador.',
  3,
  'mvp'
)
on conflict (slug) do nothing;

-- 1. Leer el contrato: preguntas de comprensión + detectar cláusulas preocupantes
insert into public.retos (modulo_id, slug, nombre, tipo, dificultad, orden, config)
select id, 'leer-contrato', 'Lee el contrato', 'lectura_contrato', 'medio', 1,
'{
  "clausulas": [
    {"id": "canon", "texto": "Canon mensual: $900.000, pagadero dentro de los primeros 5 días de cada mes.", "preocupante": false},
    {"id": "deposito", "texto": "Depósito: equivalente a 2 meses de canon ($1.800.000), reembolsable al finalizar el contrato si el inmueble se entrega en buen estado.", "preocupante": false},
    {"id": "incremento", "texto": "El canon se incrementará cada año según el IPC más 3 puntos porcentuales adicionales.", "preocupante": true},
    {"id": "reparaciones", "texto": "Todas las reparaciones del inmueble, incluidas las estructurales, correrán por cuenta del arrendatario.", "preocupante": true},
    {"id": "mora", "texto": "En caso de mora en el pago, se cobrará un interés del 5% diario sobre el saldo pendiente.", "preocupante": true},
    {"id": "terminacion", "texto": "Si el arrendatario termina el contrato antes de los 12 meses, deberá pagar una multa equivalente a 3 meses de canon.", "preocupante": false},
    {"id": "duracion", "texto": "Duración: 12 meses, prorrogables automáticamente salvo aviso escrito con 30 días de anticipación.", "preocupante": false},
    {"id": "uso", "texto": "El inmueble se destinará exclusivamente para vivienda del arrendatario y su núcleo familiar.", "preocupante": false}
  ],
  "preguntas": [
    {"id": "q1", "texto": "¿Cuánto es el canon mensual?", "opciones": ["$700.000", "$900.000", "$1.800.000"], "respuesta_correcta": 1},
    {"id": "q2", "texto": "¿Con cuántos días de anticipación hay que avisar si no se quiere renovar el contrato?", "opciones": ["15 días", "30 días", "60 días"], "respuesta_correcta": 1},
    {"id": "q3", "texto": "Si te vas antes de los 12 meses, ¿qué pasa?", "opciones": ["No pasa nada", "Pierdes el depósito completo", "Pagas una multa de 3 meses de canon"], "respuesta_correcta": 2}
  ]
}'::jsonb
from public.modulos where slug = 'contrato-arriendo'
on conflict (slug) do nothing;

-- 2. Negociar con el arrendador: simulación conversacional
insert into public.retos (modulo_id, slug, nombre, tipo, dificultad, orden, config)
select id, 'negociar-arrendador', 'Negocia con el arrendador', 'simulacion_conversacional', 'medio', 2,
'{
  "mensaje_inicial": "Hola, soy Andrés Beltrán, el arrendador. Me dijiste que querías hablar sobre el contrato antes de firmarlo, ¿qué tienes en mente?",
  "punto_negociacion": "El depósito quedó en 2 meses de canon ($1.800.000). Tu misión: intenta negociar que sea de 1 mes ($900.000).",
  "descripcion_personaje": "Andrés Beltrán, el arrendador del apartamento: profesional y cordial, pero firme con sus condiciones al inicio. Puede ceder parcialmente (por ejemplo, a 1.5 meses, o a 1 mes si el estudiante ofrece un codeudor o buenas referencias) si le dan una razón real — no cede solo porque se lo pidan amablemente."
}'::jsonb
from public.modulos where slug = 'contrato-arriendo'
on conflict (slug) do nothing;

-- ════════════════════════════════════════════════════════════
-- 0007_modulo_ahorro.sql
-- ════════════════════════════════════════════════════════════
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

-- ════════════════════════════════════════════════════════════
-- 0008_eventos_ranking.sql
-- ════════════════════════════════════════════════════════════
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
-- Intenta activar pg_cron y programar la tarea. Si la extensión no está disponible
-- en tu proyecto, NO aborta la migración (antes un error aquí revertía TODO el
-- archivo, y con él eventos_aleatorios, resolver_evento y el ranking): solo avisa.
-- Si sale el aviso, activa Database > Extensions > pg_cron y corre este bloque solo.
-- ─────────────────────────────────────────────

do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule(
    'generar-eventos-diarios',
    '0 13 * * *',
    'select public.generar_eventos_diarios();'
  );
exception when others then
  raise notice 'pg_cron no quedó programado (%). Los eventos se pueden generar a mano con: select public.generar_eventos_diarios();', sqlerrm;
end;
$$;

-- ════════════════════════════════════════════════════════════
-- 0009_consentimiento_y_rls.sql
-- ════════════════════════════════════════════════════════════
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

-- ════════════════════════════════════════════════════════════
-- 0010_ia_guia.sql
-- ════════════════════════════════════════════════════════════
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

-- ════════════════════════════════════════════════════════════
-- 0011_primer_empleo.sql
-- ════════════════════════════════════════════════════════════
-- Primer empleo: cinco retos, orden definitivo y finalización con XP idempotente.

insert into public.modulos (slug, grupo, nombre, descripcion, orden, estado)
values (
  'primer-empleo',
  'vida_profesional',
  'Primer empleo',
  'Practica cómo presentar tus habilidades, evaluar ofertas y prepararte para una entrevista.',
  3,
  'mvp'
)
on conflict (slug) do update set
  grupo = excluded.grupo,
  nombre = excluded.nombre,
  descripcion = excluded.descripcion,
  orden = excluded.orden,
  estado = excluded.estado;

update public.modulos
set orden = case slug
  when 'presupuesto-personal' then 1
  when 'ahorro-metas' then 2
  when 'primer-empleo' then 3
  when 'detectar-estafas' then 4
  when 'contrato-arriendo' then 5
  else orden
end
where slug in (
  'presupuesto-personal', 'ahorro-metas', 'primer-empleo',
  'detectar-estafas', 'contrato-arriendo'
);

insert into public.retos (modulo_id, slug, nombre, tipo, dificultad, orden, config)
select modulo.id, reto.slug, reto.nombre, reto.tipo, reto.dificultad, reto.orden, reto.config::jsonb
from (values
  (
    'hoja-de-vida', 'Crea tu hoja de vida', 'hoja_vida', 'facil', 1,
    $hoja${"campos":["perfil","habilidades","educacion","experiencia_proyectos","idiomas"],"nota":"No escribas tu nombre real, correo, teléfono, dirección ni el nombre de tu colegio. Usa proyectos, voluntariados, cursos y habilidades; no necesitas experiencia laboral formal."}$hoja$
  ),
  (
    'elegir-oferta', 'Elige una oferta', 'decision_oferta', 'facil', 2,
    $elegir${"escenario":"Buscas una opción compatible con tus estudios y quieres ganar experiencia. No hay una respuesta universal: explica qué priorizaste.","ofertas":[{"id":"atencion","titulo":"Auxiliar de atención al cliente","salario":900000,"horario":"20 horas por semana, tardes","requisitos":"Experiencia no requerida; capacitación incluida","modalidad":"Híbrida","ubicacion":"Cerca de transporte público","beneficios":"Capacitación y acompañamiento","aprendizaje":"Alto"},{"id":"biblioteca","titulo":"Apoyo en biblioteca","salario":780000,"horario":"16 horas por semana, horario acordado","requisitos":"Organización e interés por lectura","modalidad":"Presencial","ubicacion":"A pocas paradas de transporte","beneficios":"Horario estable","aprendizaje":"Alto"},{"id":"tienda","titulo":"Apoyo en tienda","salario":1100000,"horario":"32 horas por semana, turnos rotativos","requisitos":"Disponibilidad amplia; experiencia deseable","modalidad":"Presencial","ubicacion":"Dos transportes desde casa","beneficios":"Alimentación en turno","aprendizaje":"Medio"}],"nota":"Ofertas ficticias para practicar. Antes de aceptar un empleo real, verifica la empresa, las condiciones y las normas vigentes con una persona adulta de confianza."}$elegir$
  ),
  (
    'oferta-sospechosa', 'Detecta una oferta sospechosa', 'deteccion_laboral', 'medio', 3,
    $sospechosa${"oferta":"Trabajo remoto desde casa. Gana $3.500.000 al mes trabajando dos horas al día, sin experiencia ni entrevista. Para activar tu vacante debes pagar hoy una inscripción y enviarnos la clave de tu correo para validar tu identidad.","senales":[{"id":"cobro","texto":"Piden pagar para conseguir el empleo."},{"id":"claves","texto":"Solicitan claves o acceso a tus cuentas."},{"id":"promesa","texto":"Prometen un ingreso muy alto con poco trabajo y sin requisitos claros."},{"id":"presion","texto":"Presionan para pagar inmediatamente."}],"correctas":["cobro","claves","promesa","presion"]}$sospechosa$
  ),
  (
    'entrevista', 'Practica una entrevista', 'simulacion_entrevista', 'medio', 4,
    $entrevista${"preguntas":["Háblame de ti.","¿Cuáles son tus fortalezas?","¿Por qué te interesa este trabajo?","¿Cómo resolverías un problema con un cliente?","¿Qué haces cuando no sabes algo?"],"nota":"Usa ejemplos generales de estudio, proyectos o voluntariado. No incluyas nombres, datos de contacto ni información privada."}$entrevista$
  ),
  (
    'comparar-ofertas', 'Compara tus opciones', 'comparacion_ofertas', 'medio', 5,
    $comparar${"ofertas":[{"id":"aprendizaje","titulo":"Opción A","salario":820000,"horario":"18 horas semanales, fijo","transporte":"Un trayecto directo","aprendizaje":"Alto: capacitación y mentoría","estabilidad":"Contrato de seis meses","modalidad":"Presencial","beneficios":"Alimentación en turno"},{"id":"ingreso","titulo":"Opción B","salario":1050000,"horario":"28 horas semanales, variable","transporte":"Dos trayectos","aprendizaje":"Medio: experiencia práctica","estabilidad":"Contrato de tres meses","modalidad":"Híbrida","beneficios":"Auxilio de conectividad"},{"id":"flexibilidad","titulo":"Opción C","salario":760000,"horario":"12 horas semanales, flexible","transporte":"Remoto","aprendizaje":"Alto: proyectos variados","estabilidad":"Por proyecto","modalidad":"Remota","beneficios":"Horario flexible"}],"nota":"No existe una opción correcta para todas las personas. Compara las condiciones con tus prioridades y explica tus razones."}$comparar$
  )
) as reto(slug, nombre, tipo, dificultad, orden, config)
cross join public.modulos as modulo
where modulo.slug = 'primer-empleo'
on conflict (slug) do update set
  nombre = excluded.nombre,
  tipo = excluded.tipo,
  dificultad = excluded.dificultad,
  orden = excluded.orden,
  config = excluded.config;

create or replace function public.completar_reto_primer_empleo(
  p_slug text,
  p_puntaje integer,
  p_feedback jsonb
)
returns public.progreso_usuario_reto
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_reto_id uuid;
  v_personaje_id uuid;
  v_progreso public.progreso_usuario_reto;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión.';
  end if;
  if p_puntaje is null or p_puntaje < 0 or p_puntaje > 100
     or p_feedback is null or jsonb_typeof(p_feedback) <> 'object' then
    raise exception 'Resultado inválido.';
  end if;

  select retos.id into v_reto_id
  from public.retos
  join public.modulos on modulos.id = retos.modulo_id
  where retos.slug = p_slug and modulos.slug = 'primer-empleo';
  if not found then
    raise exception 'Reto no encontrado.';
  end if;

  select personajes.id into v_personaje_id
  from public.personajes
  where personajes.usuario_id = auth.uid();
  if not found then
    raise exception 'No se encontró el personaje del estudiante.';
  end if;

  insert into public.progreso_usuario_reto (
    usuario_id, reto_id, estado, intentos, puntaje, feedback_ia,
    completado_en, actualizado_en
  )
  values (
    auth.uid(), v_reto_id, 'completado', 1, p_puntaje, p_feedback,
    now(), now()
  )
  on conflict (usuario_id, reto_id) do update set
    estado = 'completado',
    intentos = progreso_usuario_reto.intentos + 1,
    puntaje = excluded.puntaje,
    feedback_ia = excluded.feedback_ia,
    completado_en = now(),
    actualizado_en = now()
  where progreso_usuario_reto.estado <> 'completado'
  returning * into v_progreso;

  if found then
    perform public.otorgar_xp(v_personaje_id, greatest(p_puntaje, 10));
    return v_progreso;
  end if;

  select * into v_progreso
  from public.progreso_usuario_reto
  where usuario_id = auth.uid() and reto_id = v_reto_id;
  return v_progreso;
end;
$$;

revoke all on function public.completar_reto_primer_empleo(text, integer, jsonb) from public;
grant execute on function public.completar_reto_primer_empleo(text, integer, jsonb) to authenticated;

-- ════════════════════════════════════════════════════════════
-- 0012_roles_educadores.sql
-- ════════════════════════════════════════════════════════════
-- Rol educativo controlado por app_metadata y registro mediante invitación.

alter table public.perfiles
  add column if not exists cargo_educativo text,
  add column if not exists area_educativa text,
  add column if not exists cursos_educativos text[] not null default '{}';

update public.perfiles
set rol = 'estudiante'
where rol not in ('estudiante', 'educador', 'administrador');

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'perfiles_rol_permitido_check'
      and conrelid = 'public.perfiles'::regclass
  ) then
    alter table public.perfiles
      add constraint perfiles_rol_permitido_check
      check (rol in ('estudiante', 'educador', 'administrador'));
  end if;
end;
$$;

create table if not exists public.invitaciones_educador (
  id uuid primary key default gen_random_uuid(),
  colegio_id uuid not null references public.colegios(id),
  correo_institucional text not null,
  codigo_hash text not null unique,
  expira_en timestamptz not null,
  usada_en timestamptz,
  creada_en timestamptz not null default now()
);

alter table public.invitaciones_educador enable row level security;
revoke all on public.invitaciones_educador from anon, authenticated;

-- Solo SQL Editor/backend confiable debe crear invitaciones. codigo_hash es SHA-256
-- de un código aleatorio de al menos 32 bytes; nunca se almacena el código en claro.
create or replace function public.crear_invitacion_educador(
  p_colegio_id uuid,
  p_correo_institucional text,
  p_codigo_hash text,
  p_expira_en timestamptz default now() + interval '7 days'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_codigo_hash !~ '^[a-f0-9]{64}$'
     or p_correo_institucional !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     or p_expira_en <= now()
     or not exists (select 1 from public.colegios where id = p_colegio_id) then
    raise exception 'Invitación inválida.';
  end if;

  insert into public.invitaciones_educador (
    colegio_id, correo_institucional, codigo_hash, expira_en
  )
  values (
    p_colegio_id, lower(trim(p_correo_institucional)), p_codigo_hash, p_expira_en
  )
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.crear_invitacion_educador(uuid, text, text, timestamptz) from public;
grant execute on function public.crear_invitacion_educador(uuid, text, text, timestamptz) to postgres, service_role;

-- La función handle_new_user() que asigna el rol vive en 0017_auth_trigger_roles.sql
-- (una sola definición, en vez de reescribirla en cada migración).

drop policy if exists "perfiles: el usuario ve/edita solo su perfil" on public.perfiles;
drop policy if exists "perfiles: lectura del propio perfil" on public.perfiles;
create policy "perfiles: lectura del propio perfil"
  on public.perfiles for select using (auth.uid() = id);
drop policy if exists "perfiles: actualización del propio perfil" on public.perfiles;
create policy "perfiles: actualización del propio perfil"
  on public.perfiles for update using (auth.uid() = id) with check (auth.uid() = id);
revoke insert, update, delete on public.perfiles from authenticated;
grant update (nombre, curso, colegio_id) on public.perfiles to authenticated;

-- El ranking por colegio es una vista de estudiante, no una consulta del panel educativo.
create or replace function public.obtener_ranking_colegio()
returns table (nombre text, curso text, nivel int, xp int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colegio_id uuid;
begin
  select colegio_id into v_colegio_id
  from public.perfiles
  where id = auth.uid() and rol = 'estudiante';
  if not found or v_colegio_id is null then return; end if;

  return query
  select p.nombre, p.curso, personaje.nivel, personaje.xp
  from public.perfiles p
  join public.personajes personaje on personaje.usuario_id = p.id
  where p.colegio_id = v_colegio_id and p.rol = 'estudiante'
  order by personaje.xp desc
  limit 50;
end;
$$;

revoke all on function public.obtener_ranking_colegio() from public;
grant execute on function public.obtener_ranking_colegio() to authenticated;

-- ════════════════════════════════════════════════════════════
-- 0013_rls_finanzas_seguras.sql
-- ════════════════════════════════════════════════════════════
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

-- ════════════════════════════════════════════════════════════
-- 0014_panel_educadores.sql
-- ════════════════════════════════════════════════════════════
-- Consultas educativas minimizadas y reportes privados del educador.

create table if not exists public.informes_educativos (
  id uuid primary key default gen_random_uuid(),
  educador_id uuid not null references public.perfiles(id),
  colegio_id uuid not null references public.colegios(id),
  estudiante_id uuid references public.perfiles(id),
  curso text,
  periodo text not null check (length(periodo) between 1 and 40),
  datos_observados jsonb not null,
  recomendaciones_ia jsonb not null,
  creado_en timestamptz not null default now()
);

create index if not exists informes_educativos_owner_idx
  on public.informes_educativos (educador_id, creado_en desc);

alter table public.informes_educativos enable row level security;
create policy "informes: educador lee sus informes del propio colegio"
  on public.informes_educativos for select
  using (
    educador_id = auth.uid()
    and exists (
      select 1 from public.perfiles educador
      where educador.id = auth.uid()
        and educador.rol = 'educador'
        and educador.colegio_id = informes_educativos.colegio_id
    )
  );
create policy "informes: educador crea sus informes del propio colegio"
  on public.informes_educativos for insert
  with check (
    educador_id = auth.uid()
    and exists (
      select 1 from public.perfiles educador
      where educador.id = auth.uid()
        and educador.rol = 'educador'
        and educador.colegio_id = informes_educativos.colegio_id
    )
    and (
      estudiante_id is null
      or exists (
        select 1 from public.perfiles estudiante
        where estudiante.id = informes_educativos.estudiante_id
          and estudiante.rol = 'estudiante'
          and estudiante.colegio_id = informes_educativos.colegio_id
          and estudiante.consentimiento_acudiente = 'aprobado'
      )
    )
  );
revoke update, delete on public.informes_educativos from authenticated;

create or replace function public.obtener_estudiantes_educador()
returns table (
  estudiante_id uuid,
  nombre text,
  curso text,
  nivel integer,
  xp integer,
  retos_completados integer,
  total_retos integer,
  progreso_promedio integer,
  progreso_modulos jsonb,
  actividad_reciente jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colegio_id uuid;
begin
  select perfiles.colegio_id into v_colegio_id
  from public.perfiles
  where perfiles.id = auth.uid() and perfiles.rol = 'educador';
  if not found or v_colegio_id is null then
    raise exception 'Acceso educativo no autorizado.';
  end if;

  return query
  select
    estudiante.id,
    estudiante.nombre,
    estudiante.curso,
    coalesce(personaje.nivel, 1),
    coalesce(personaje.xp, 0),
    estadisticas.retos_completados,
    estadisticas.total_retos,
    estadisticas.progreso_promedio,
    estadisticas.progreso_modulos,
    recientes.actividad_reciente
  from public.perfiles estudiante
  left join public.personajes personaje on personaje.usuario_id = estudiante.id
  cross join lateral (
    select
      coalesce(sum(modulo.total), 0)::integer as total_retos,
      coalesce(sum(modulo.completados), 0)::integer as retos_completados,
      coalesce(round(avg(case when modulo.total = 0 then 0 else 100.0 * modulo.completados / modulo.total end)), 0)::integer as progreso_promedio,
      coalesce(jsonb_agg(modulo.resumen order by modulo.orden), '[]'::jsonb) as progreso_modulos
    from (
      select
        m.orden,
        count(r.id)::integer as total,
        count(r.id) filter (where p.estado = 'completado')::integer as completados,
        jsonb_build_object(
          'slug', m.slug,
          'nombre', m.nombre,
          'total', count(r.id)::integer,
          'completados', count(r.id) filter (where p.estado = 'completado')::integer,
          'porcentaje', case
            when count(r.id) = 0 then 0
            else round(100.0 * count(r.id) filter (where p.estado = 'completado') / count(r.id))::integer
          end
        ) as resumen
      from public.modulos m
      left join public.retos r on r.modulo_id = m.id
      left join public.progreso_usuario_reto p
        on p.reto_id = r.id and p.usuario_id = estudiante.id
      where m.estado = 'mvp'
      group by m.id
    ) modulo
  ) estadisticas
  cross join lateral (
    select coalesce(jsonb_agg(to_jsonb(actividad) order by actividad.actualizado_en desc), '[]'::jsonb) as actividad_reciente
    from (
      select r.nombre as reto, p.puntaje, p.actualizado_en
      from public.progreso_usuario_reto p
      join public.retos r on r.id = p.reto_id
      where p.usuario_id = estudiante.id and p.estado = 'completado'
      order by p.actualizado_en desc
      limit 5
    ) actividad
  ) recientes
  where estudiante.colegio_id = v_colegio_id
    and estudiante.rol = 'estudiante'
    and estudiante.consentimiento_acudiente = 'aprobado'
  order by estudiante.curso nulls last, estudiante.nombre;
end;
$$;

create or replace function public.obtener_estudiante_educador(p_estudiante_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estudiante jsonb;
begin
  select to_jsonb(estudiante) into v_estudiante
  from public.obtener_estudiantes_educador() estudiante
  where estudiante.estudiante_id = p_estudiante_id;
  return v_estudiante;
end;
$$;

revoke all on function public.obtener_estudiantes_educador() from public;
grant execute on function public.obtener_estudiantes_educador() to authenticated;
revoke all on function public.obtener_estudiante_educador(uuid) from public;
grant execute on function public.obtener_estudiante_educador(uuid) to authenticated;

-- ════════════════════════════════════════════════════════════
-- 0015_perfil_avatar_auditoria.sql
-- ════════════════════════════════════════════════════════════
-- Avatar cerrado, auditoría minimizada y permisos de actualización por columna.

alter table public.perfiles
  add column if not exists avatar_id text not null default 'avatar_01';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'perfiles_avatar_id_check'
      and conrelid = 'public.perfiles'::regclass
  ) then
    alter table public.perfiles
      add constraint perfiles_avatar_id_check
      check (avatar_id in (
        'avatar_01', 'avatar_02', 'avatar_03', 'avatar_04',
        'avatar_05', 'avatar_06', 'avatar_07', 'avatar_08'
      ));
  end if;
end;
$$;

create table if not exists public.cambios_perfil (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfiles(id),
  tipo_cambio text not null check (tipo_cambio in (
    'nombre_modificado', 'correo_modificado', 'colegio_modificado',
    'curso_modificado', 'avatar_modificado'
  )),
  descripcion text not null check (length(descripcion) <= 160),
  creado_en timestamptz not null default now()
);

create index if not exists cambios_perfil_usuario_fecha_idx
  on public.cambios_perfil (usuario_id, creado_en desc);

alter table public.cambios_perfil enable row level security;
create policy "cambios_perfil: lectura propia"
  on public.cambios_perfil for select using (auth.uid() = usuario_id);
revoke insert, update, delete on public.cambios_perfil from authenticated;

revoke update on public.perfiles from authenticated;
revoke update (nombre, curso, colegio_id) on public.perfiles from authenticated;

create or replace function public.registrar_cambio_correo()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
  insert into public.cambios_perfil (usuario_id, tipo_cambio, descripcion)
  values (auth.uid(), 'correo_modificado', 'correo modificado');
end;
$$;

revoke all on function public.registrar_cambio_correo() from public;
grant execute on function public.registrar_cambio_correo() to authenticated;

create or replace function public.actualizar_perfil(
  p_nombre text,
  p_curso text,
  p_colegio_id uuid,
  p_avatar_id text
)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_perfil public.perfiles;
  v_cambios text[] := '{}';
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
  if p_nombre is null or length(trim(p_nombre)) not between 2 and 80
     or trim(p_nombre) ~ '[^[:alpha:] .''-]'
     or p_curso is not null and length(p_curso) > 30
     or p_curso is not null and p_curso ~ '[^[:alnum:] .''-]'
     or p_avatar_id not in (
       'avatar_01', 'avatar_02', 'avatar_03', 'avatar_04',
       'avatar_05', 'avatar_06', 'avatar_07', 'avatar_08'
     ) then
    raise exception 'Datos de perfil inválidos.';
  end if;
  if p_colegio_id is not null and not exists (
    select 1 from public.colegios where id = p_colegio_id
  ) then
    raise exception 'El colegio seleccionado no existe.';
  end if;

  select * into v_perfil
  from public.perfiles
  where id = auth.uid()
  for update;
  if not found then raise exception 'Perfil no encontrado.'; end if;
  if v_perfil.rol = 'educador' and p_colegio_id is distinct from v_perfil.colegio_id then
    raise exception 'La institución educativa no puede cambiarse desde el perfil.';
  end if;

  if v_perfil.nombre is distinct from trim(p_nombre) then v_cambios := array_append(v_cambios, 'nombre_modificado'); end if;
  if v_perfil.curso is distinct from nullif(trim(p_curso), '') then v_cambios := array_append(v_cambios, 'curso_modificado'); end if;
  if v_perfil.colegio_id is distinct from p_colegio_id then v_cambios := array_append(v_cambios, 'colegio_modificado'); end if;
  if v_perfil.avatar_id is distinct from p_avatar_id then v_cambios := array_append(v_cambios, 'avatar_modificado'); end if;

  update public.perfiles
  set nombre = trim(p_nombre),
      curso = nullif(trim(p_curso), ''),
      colegio_id = p_colegio_id,
      avatar_id = p_avatar_id
  where id = auth.uid();

  insert into public.cambios_perfil (usuario_id, tipo_cambio, descripcion)
  select auth.uid(), filas.cambio, replace(filas.cambio, '_', ' ')
  from unnest(v_cambios) as filas(cambio);

  return v_cambios;
end;
$$;

revoke all on function public.actualizar_perfil(text, text, uuid, text) from public;
grant execute on function public.actualizar_perfil(text, text, uuid, text) to authenticated;

-- ════════════════════════════════════════════════════════════
-- 0016_api_privileges.sql
-- ════════════════════════════════════════════════════════════
-- Privilegios SQL explícitos para PostgREST.
-- RLS filtra filas, pero no concede privilegios SELECT/INSERT/UPDATE/DELETE.

grant usage on schema public to anon, authenticated, service_role;

-- Registro público: el colegio es seleccionable, pero nunca insertable por clientes.
drop policy if exists "colegios: cualquiera puede registrar uno nuevo" on public.colegios;
grant select on public.colegios to anon, authenticated, service_role;
revoke insert, update, delete on public.colegios from anon, authenticated;

-- El catálogo es público; el progreso personal se filtra por auth.uid() en RLS.
grant select on public.modulos, public.retos to anon, authenticated, service_role;
grant select, insert, update on public.progreso_usuario_reto to authenticated, service_role;
revoke delete on public.progreso_usuario_reto from authenticated;

-- Perfiles y finanzas: lectura directa protegida por RLS; las escrituras usan RPCs.
grant select on public.perfiles to authenticated, service_role;
grant select on public.personajes, public.transacciones to authenticated, service_role;
grant select on public.metas_ahorro, public.eventos_aleatorios to authenticated, service_role;
revoke insert, update, delete on public.perfiles from anon, authenticated;
revoke insert, update, delete on public.personajes, public.transacciones from anon, authenticated;
revoke insert, update, delete on public.metas_ahorro, public.eventos_aleatorios from anon, authenticated;

-- Consentimiento y chat: cada tabla conserva sus policies de propiedad.
grant select on public.solicitudes_consentimiento to authenticated, service_role;
grant select, insert, delete on public.mensajes_ia_guia to authenticated, service_role;
revoke update on public.mensajes_ia_guia from authenticated;

-- Reportes: solo lectura/creación por la policy educativa del mismo colegio.
grant select, insert on public.informes_educativos to authenticated, service_role;
revoke update, delete on public.informes_educativos from authenticated;

-- Auditoría: se escribe exclusivamente desde RPCs controlados.
grant select on public.cambios_perfil to authenticated, service_role;
revoke insert, update, delete on public.cambios_perfil from anon, authenticated;

-- La invitación se consume con el cliente server-only de service_role.
revoke all on public.invitaciones_educador from anon, authenticated, service_role;
grant select, update on public.invitaciones_educador to service_role;

-- El cron ejecuta generar_eventos_diarios como postgres. No debe ser invocable por clientes.
revoke all on function public.generar_eventos_diarios() from public, anon, authenticated;
grant execute on function public.generar_eventos_diarios() to postgres, service_role;

-- El trigger se ejecuta como propietario al crear usuarios; no se expone como RPC.
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- ════════════════════════════════════════════════════════════
-- 0017_auth_trigger_roles.sql
-- ════════════════════════════════════════════════════════════
-- preparatorIA — Trigger definitivo de alta de usuarios (perfil + rol + personaje).
--
-- Esta es la ÚNICA definición de handle_new_user() que debe quedar aplicada.
-- Antes había cuatro versiones (0002, 0009, 0012, 0017, 0018) y la última exigía que
-- la invitación ya tuviera el UUID del usuario ANTES de que el usuario existiera,
-- algo imposible: por eso todos los educadores terminaban como 'estudiante'.
--
-- Cómo se decide el rol ahora (nunca desde campos que el navegador pueda editar):
--   1. Invitación consumida: el backend marca invitaciones_educador.usada_en justo
--      antes de crear la cuenta con la service-role key; el trigger la encuentra por
--      correo (el correo SÍ existe en el INSERT), la vincula al usuario y asigna educador.
--   2. Respaldo: raw_app_meta_data.rol = 'educador'. app_metadata solo lo escribe la
--      service-role key (signUp público solo escribe raw_user_meta_data).
--   Cualquier otro caso => estudiante.

alter table public.invitaciones_educador
  add column if not exists usuario_id uuid references public.perfiles(id);

create unique index if not exists invitaciones_educador_usuario_idx
  on public.invitaciones_educador (usuario_id)
  where usuario_id is not null;

-- Conversión a uuid que devuelve NULL en vez de lanzar error con valores malformados.
create or replace function public.uuid_seguro(p_texto text)
returns uuid
language sql
immutable
as $$
  select case
    when p_texto ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then p_texto::uuid
  end;
$$;

revoke all on function public.uuid_seguro(text) from public;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_invitacion public.invitaciones_educador;
  v_es_educador boolean := false;
  v_rol text;
  v_colegio_id uuid;
  v_fecha_nacimiento date;
  v_es_menor boolean := false;
  v_cursos text[] := '{}';
begin
  -- 1) ¿Hay una invitación consumida hace poco para este correo?
  select * into v_invitacion
  from public.invitaciones_educador
  where lower(correo_institucional) = lower(new.email)
    and usada_en is not null
    and usuario_id is null
    and usada_en <= expira_en
    and usada_en > now() - interval '10 minutes'
  order by usada_en desc
  limit 1
  for update;

  if found then
    v_es_educador := true;
    v_colegio_id := v_invitacion.colegio_id;
  elsif new.raw_app_meta_data ->> 'rol' = 'educador' then
    -- 2) Respaldo: app_metadata (solo escribible con service-role).
    v_es_educador := true;
    v_colegio_id := public.uuid_seguro(new.raw_app_meta_data ->> 'colegio_id');
  end if;

  v_rol := case when v_es_educador then 'educador' else 'estudiante' end;

  if not v_es_educador then
    v_colegio_id := public.uuid_seguro(v_meta ->> 'colegio_id');
    begin
      v_fecha_nacimiento := nullif(v_meta ->> 'fecha_nacimiento', '')::date;
    exception when others then
      v_fecha_nacimiento := null; -- fecha malformada: no bloquea el registro
    end;
    v_es_menor := v_fecha_nacimiento is not null
      and age(v_fecha_nacimiento) < interval '18 years';
  elsif jsonb_typeof(v_meta -> 'cursos_educativos') = 'array' then
    v_cursos := array(select jsonb_array_elements_text(v_meta -> 'cursos_educativos'));
  end if;

  -- Un colegio inexistente no debe romper el alta por la llave foránea.
  if v_colegio_id is not null
     and not exists (select 1 from public.colegios where id = v_colegio_id) then
    v_colegio_id := null;
  end if;

  insert into public.perfiles (
    id, nombre, fecha_nacimiento, colegio_id, curso,
    correo_acudiente, consentimiento_acudiente, rol,
    cargo_educativo, area_educativa, cursos_educativos
  )
  values (
    new.id,
    coalesce(nullif(trim(v_meta ->> 'nombre'), ''),
             case when v_es_educador then 'Docente' else 'Estudiante' end),
    v_fecha_nacimiento,
    v_colegio_id,
    case when not v_es_educador then v_meta ->> 'curso' end,
    case when not v_es_educador then v_meta ->> 'correo_acudiente' end,
    case when v_es_menor then 'pendiente' else 'aprobado' end,
    v_rol,
    case when v_es_educador then v_meta ->> 'cargo_educativo' end,
    case when v_es_educador then v_meta ->> 'area_educativa' end,
    v_cursos
  );

  if v_es_educador then
    if v_invitacion.id is not null then
      update public.invitaciones_educador
      set usuario_id = new.id
      where id = v_invitacion.id;
    end if;
  else
    insert into public.personajes (usuario_id, saldo_billetera, salario_mensual, nivel, xp)
    values (new.id, 0, 1200000, 1, 0);

    if v_es_menor then
      insert into public.solicitudes_consentimiento (perfil_id) values (new.id);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public, anon, authenticated;
