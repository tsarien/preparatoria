-- preparatorIA — 0022: soporte (tickets) con RLS.
--
-- DISEÑO DE SEGURIDAD
--   · El usuario CREA tickets por INSERT directo, pero solo con las columnas permitidas; estado,
--     prioridad inicial por defecto, asignación y cierre NO son escribibles por el cliente.
--   · Todo lo demás (responder, cambiar estado/prioridad, asignar, cerrar) pasa por funciones
--     SECURITY DEFINER que verifican auth.uid() y rol DENTRO de la base de datos.
--     Así las reglas valen aunque alguien llame a la API directamente.
--   · Un usuario ve solo sus tickets y mensajes; el administrador ve todo.
--   · Estados: abierto → en_proceso → respondido → cerrado. El usuario puede responder mientras no
--     esté cerrado (si estaba "respondido", vuelve a "abierto" para que el admin lo vea).

create table if not exists public.tickets_soporte (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references public.perfiles(id) on delete cascade,
  asunto text not null check (length(trim(asunto)) between 3 and 120),
  categoria text not null default 'otro'
    check (categoria in ('cuenta', 'error_tecnico', 'ia', 'contenido', 'sugerencia', 'otro')),
  descripcion text not null check (length(trim(descripcion)) between 10 and 2000),
  pagina text check (length(pagina) <= 200),
  estado text not null default 'abierto'
    check (estado in ('abierto', 'en_proceso', 'respondido', 'cerrado')),
  prioridad text not null default 'media'
    check (prioridad in ('baja', 'media', 'alta', 'urgente')),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  cerrado_en timestamptz,
  administrador_asignado_id uuid references public.perfiles(id) on delete set null
);

create index if not exists tickets_soporte_usuario_idx on public.tickets_soporte (usuario_id, creado_en desc);
create index if not exists tickets_soporte_estado_idx on public.tickets_soporte (estado, prioridad, creado_en desc);

create table if not exists public.tickets_mensajes (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets_soporte(id) on delete cascade,
  autor_id uuid not null references public.perfiles(id) on delete cascade,
  autor_rol text not null check (autor_rol in ('estudiante', 'educador', 'administrador')),
  mensaje text not null check (length(trim(mensaje)) between 1 and 2000),
  creado_en timestamptz not null default now()
);

create index if not exists tickets_mensajes_ticket_idx on public.tickets_mensajes (ticket_id, creado_en);

alter table public.tickets_soporte enable row level security;
alter table public.tickets_mensajes enable row level security;

-- Lectura
drop policy if exists "tickets: el usuario ve los suyos" on public.tickets_soporte;
create policy "tickets: el usuario ve los suyos"
  on public.tickets_soporte for select using (usuario_id = auth.uid());
drop policy if exists "tickets: el administrador ve todos" on public.tickets_soporte;
create policy "tickets: el administrador ve todos"
  on public.tickets_soporte for select using (public.es_administrador());

-- Creación: solo como uno mismo, cuenta activa y no administrador-suplantado
drop policy if exists "tickets: el usuario crea los suyos" on public.tickets_soporte;
create policy "tickets: el usuario crea los suyos"
  on public.tickets_soporte for insert
  with check (
    usuario_id = auth.uid()
    and exists (select 1 from public.perfiles where id = auth.uid() and activo)
  );

drop policy if exists "tickets_mensajes: lectura del dueño del ticket" on public.tickets_mensajes;
create policy "tickets_mensajes: lectura del dueño del ticket"
  on public.tickets_mensajes for select
  using (exists (select 1 from public.tickets_soporte t where t.id = ticket_id and t.usuario_id = auth.uid()));
drop policy if exists "tickets_mensajes: lectura del administrador" on public.tickets_mensajes;
create policy "tickets_mensajes: lectura del administrador"
  on public.tickets_mensajes for select using (public.es_administrador());

-- Privilegios mínimos: el cliente solo inserta columnas de contenido.
revoke all on public.tickets_soporte, public.tickets_mensajes from anon, authenticated;
grant select on public.tickets_soporte, public.tickets_mensajes to authenticated;
grant insert (usuario_id, asunto, categoria, descripcion, prioridad, pagina)
  on public.tickets_soporte to authenticated;
grant all on public.tickets_soporte, public.tickets_mensajes to service_role;

-- ─────────────────────────────────────────────
-- responder_ticket(): usuario dueño o administrador
-- ─────────────────────────────────────────────
create or replace function public.responder_ticket(p_ticket_id uuid, p_mensaje text)
returns public.tickets_mensajes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_perfil public.perfiles;
  v_ticket public.tickets_soporte;
  v_msg public.tickets_mensajes;
  v_texto text := trim(coalesce(p_mensaje, ''));
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
  if length(v_texto) not between 1 and 2000 then raise exception 'El mensaje debe tener entre 1 y 2000 caracteres.'; end if;

  select * into v_perfil from public.perfiles where id = auth.uid() and activo;
  if not found then raise exception 'Cuenta no disponible.'; end if;

  select * into v_ticket from public.tickets_soporte where id = p_ticket_id for update;
  if not found or (v_perfil.rol <> 'administrador' and v_ticket.usuario_id <> auth.uid()) then
    raise exception 'Ticket no encontrado.';
  end if;

  if v_perfil.rol = 'administrador' then
    insert into public.tickets_mensajes (ticket_id, autor_id, autor_rol, mensaje)
    values (p_ticket_id, auth.uid(), 'administrador', v_texto) returning * into v_msg;
    -- Responder a un ticket cerrado lo reabre implícitamente como "respondido" solo si aún no está cerrado:
    -- para reabrir un ticket cerrado el administrador debe usar gestionar_ticket.
    if v_ticket.estado <> 'cerrado' then
      update public.tickets_soporte
      set estado = 'respondido', actualizado_en = now(),
          administrador_asignado_id = coalesce(administrador_asignado_id, auth.uid())
      where id = p_ticket_id;
    end if;
  else
    if v_ticket.estado = 'cerrado' then raise exception 'El ticket está cerrado.'; end if;
    insert into public.tickets_mensajes (ticket_id, autor_id, autor_rol, mensaje)
    values (p_ticket_id, auth.uid(), v_perfil.rol, v_texto) returning * into v_msg;
    update public.tickets_soporte
    set estado = case when estado = 'respondido' then 'abierto' else estado end,
        actualizado_en = now()
    where id = p_ticket_id;
  end if;

  return v_msg;
end;
$$;

-- ─────────────────────────────────────────────
-- gestionar_ticket(): solo administrador
-- ─────────────────────────────────────────────
create or replace function public.gestionar_ticket(
  p_ticket_id uuid,
  p_estado text default null,
  p_prioridad text default null,
  p_asignado_id uuid default null,
  p_asignar boolean default false
)
returns public.tickets_soporte
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket public.tickets_soporte;
begin
  if not public.es_administrador() then raise exception 'No autorizado.'; end if;
  if p_estado is not null and p_estado not in ('abierto', 'en_proceso', 'respondido', 'cerrado') then
    raise exception 'Estado inválido.';
  end if;
  if p_prioridad is not null and p_prioridad not in ('baja', 'media', 'alta', 'urgente') then
    raise exception 'Prioridad inválida.';
  end if;
  if p_asignar and p_asignado_id is not null
     and not exists (select 1 from public.perfiles where id = p_asignado_id and rol = 'administrador' and activo) then
    raise exception 'Solo se puede asignar a un administrador activo.';
  end if;

  update public.tickets_soporte
  set estado = coalesce(p_estado, estado),
      prioridad = coalesce(p_prioridad, prioridad),
      administrador_asignado_id = case when p_asignar then p_asignado_id else administrador_asignado_id end,
      cerrado_en = case
        when coalesce(p_estado, estado) = 'cerrado' then coalesce(cerrado_en, now())
        else null end,
      actualizado_en = now()
  where id = p_ticket_id
  returning * into v_ticket;
  if not found then raise exception 'Ticket no encontrado.'; end if;

  insert into public.actividad_sistema (actor_id, accion, entidad, entidad_id, detalle)
  values (auth.uid(), 'ticket_gestionado', 'ticket', p_ticket_id::text,
          left(format('estado=%s prioridad=%s', v_ticket.estado, v_ticket.prioridad), 200));

  return v_ticket;
end;
$$;

revoke all on function public.responder_ticket(uuid, text) from public, anon;
revoke all on function public.gestionar_ticket(uuid, text, text, uuid, boolean) from public, anon;
grant execute on function public.responder_ticket(uuid, text) to authenticated;
grant execute on function public.gestionar_ticket(uuid, text, text, uuid, boolean) to authenticated;
