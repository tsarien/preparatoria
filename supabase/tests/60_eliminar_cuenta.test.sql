-- Pruebas de 0024: eliminar_datos_usuario borra todo el historial y respeta permisos.
begin;
create or replace function pg_temp.afirmar(cond boolean, msg text) returns void language plpgsql as $$ begin if not coalesce(cond,false) then raise exception 'FALLÓ: %', msg; end if; end $$;
create or replace function pg_temp.falla(q text) returns boolean language plpgsql as $$ begin execute q; return false; exception when others then return true; end $$;

insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
 ('a0000000-0000-0000-0000-000000000001','est@t.co','{"nombre":"Est Uno","fecha_nacimiento":"2000-01-01"}','{}'),
 ('a0000000-0000-0000-0000-000000000003','doc@t.co','{"nombre":"Docente"}','{"rol":"educador"}'),
 ('a0000000-0000-0000-0000-000000000005','adm@t.co','{"nombre":"Admin"}','{"rol":"administrador"}');

-- Historial del estudiante
insert into public.transacciones (personaje_id, tipo, monto)
  select id, 'gasto', 1000 from public.personajes where usuario_id = 'a0000000-0000-0000-0000-000000000001';
insert into public.mensajes_ia_guia (perfil_id, autor, texto) values ('a0000000-0000-0000-0000-000000000001','estudiante','hola');
insert into public.cambios_perfil (usuario_id, tipo_cambio, descripcion) values ('a0000000-0000-0000-0000-000000000001','nombre_modificado','x');
insert into public.tickets_soporte (usuario_id, asunto, descripcion) values ('a0000000-0000-0000-0000-000000000001','Asunto','descripción suficientemente larga');
-- Informe de la docente sobre el estudiante
insert into public.informes_educativos (educador_id, colegio_id, estudiante_id, periodo, datos_observados, recomendaciones_ia)
  select 'a0000000-0000-0000-0000-000000000003', id, 'a0000000-0000-0000-0000-000000000001', 'Primer periodo 2026', '{}'::jsonb, '{}'::jsonb
  from public.colegios limit 1;

select public.eliminar_datos_usuario('a0000000-0000-0000-0000-000000000001');
select pg_temp.afirmar(not exists (select 1 from public.perfiles where id = 'a0000000-0000-0000-0000-000000000001'), 'perfil del estudiante eliminado');
select pg_temp.afirmar(not exists (select 1 from public.personajes where usuario_id = 'a0000000-0000-0000-0000-000000000001'), 'personaje eliminado');
select pg_temp.afirmar(not exists (select 1 from public.tickets_soporte where usuario_id = 'a0000000-0000-0000-0000-000000000001'), 'tickets eliminados por cascada');
select pg_temp.afirmar((select estudiante_id is null from public.informes_educativos limit 1), 'el informe conserva su texto y pierde la referencia al estudiante');

-- Docente: se van sus informes y conversaciones
insert into public.conversaciones_ia (perfil_id, tipo, titulo) values ('a0000000-0000-0000-0000-000000000003','educativa','x');
select public.eliminar_datos_usuario('a0000000-0000-0000-0000-000000000003');
select pg_temp.afirmar(not exists (select 1 from public.perfiles where id = 'a0000000-0000-0000-0000-000000000003'), 'educador eliminado');
select pg_temp.afirmar(not exists (select 1 from public.informes_educativos), 'informes del educador eliminados');
select pg_temp.afirmar(not exists (select 1 from public.conversaciones_ia), 'conversaciones del educador eliminadas');

-- Administradores no se eliminan, y los clientes no pueden ejecutar la función
select pg_temp.afirmar(pg_temp.falla($q$ select public.eliminar_datos_usuario('a0000000-0000-0000-0000-000000000005') $q$), 'no elimina administradores');
set local role authenticated;
select pg_temp.afirmar(pg_temp.falla($q$ select public.eliminar_datos_usuario('a0000000-0000-0000-0000-000000000005') $q$), 'authenticated no ejecuta eliminar_datos_usuario');
reset role;
set local role anon;
select pg_temp.afirmar(pg_temp.falla($q$ select public.eliminar_datos_usuario(gen_random_uuid()) $q$), 'anon no ejecuta eliminar_datos_usuario');
reset role;
rollback;
\echo '  ✔ 60_eliminar_cuenta: todas las afirmaciones pasaron'
