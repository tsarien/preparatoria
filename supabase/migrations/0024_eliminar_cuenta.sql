-- preparatorIA — 0024: eliminación completa de los datos de una cuenta (solo service_role).
--
-- POR QUÉ
--   Varias llaves foráneas hacia perfiles/personajes no tienen ON DELETE CASCADE
--   (personajes, transacciones, progreso, metas, eventos, consentimientos, mensajes de IA, cambios
--   de perfil, informes). Borrar un perfil con historial fallaba. Esta función borra, en una sola
--   transacción y en el orden correcto, todo lo asociado a un estudiante o educador. Después la
--   aplicación elimina el usuario de Supabase Auth con la Auth Admin API.
--
-- SEGURIDAD
--   · SECURITY DEFINER con search_path fijo; ejecución solo para service_role (la app la llama
--     únicamente tras verificar auth.uid() + rol administrador en el servidor).
--   · Se niega a eliminar administradores.
--   · Los informes educativos que el educador escribió sobre otros se borran con él; los que
--     mencionan a un estudiante eliminado conservan el informe pero pierden la referencia.

create or replace function public.eliminar_datos_usuario(p_usuario_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol text;
begin
  select rol into v_rol from public.perfiles where id = p_usuario_id;
  if not found then
    return;
  end if;
  if v_rol = 'administrador' then
    raise exception 'No se pueden eliminar administradores desde la aplicación.';
  end if;

  delete from public.transacciones
    where personaje_id in (select id from public.personajes where usuario_id = p_usuario_id);
  delete from public.metas_ahorro
    where personaje_id in (select id from public.personajes where usuario_id = p_usuario_id);
  delete from public.eventos_aleatorios
    where personaje_id in (select id from public.personajes where usuario_id = p_usuario_id);
  delete from public.personajes where usuario_id = p_usuario_id;

  delete from public.progreso_usuario_reto where usuario_id = p_usuario_id;
  delete from public.solicitudes_consentimiento where perfil_id = p_usuario_id;
  delete from public.mensajes_ia_guia where perfil_id = p_usuario_id;
  delete from public.cambios_perfil where usuario_id = p_usuario_id;

  delete from public.informes_educativos where educador_id = p_usuario_id;
  update public.informes_educativos set estudiante_id = null where estudiante_id = p_usuario_id;
  update public.invitaciones_educador set usuario_id = null where usuario_id = p_usuario_id;

  -- tickets, mensajes de ticket, conversaciones y mensajes de IA educativa caen por CASCADE.
  delete from public.perfiles where id = p_usuario_id;
end;
$$;

revoke all on function public.eliminar_datos_usuario(uuid) from public, anon, authenticated;
grant execute on function public.eliminar_datos_usuario(uuid) to service_role;
