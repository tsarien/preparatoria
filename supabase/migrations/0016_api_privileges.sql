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