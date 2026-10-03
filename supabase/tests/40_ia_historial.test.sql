-- Pruebas de 0023: historiales de IA separados y aislados por usuario.
begin;
create or replace function pg_temp.afirmar(cond boolean, msg text) returns void language plpgsql as $$ begin if not coalesce(cond,false) then raise exception 'FALLÓ: %', msg; end if; end $$;
create or replace function pg_temp.como(uid text) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub', coalesce(uid,''), true); end $$;
create or replace function pg_temp.falla(q text) returns boolean language plpgsql as $$ begin execute q; return false; exception when others then return true; end $$;

insert into public.invitaciones_educador (colegio_id, correo_institucional, codigo_hash, expira_en, usada_en)
select id, 'doc@c.edu.co', repeat('c',64), now()+interval '1 day', now() from public.colegios limit 1;
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
 ('a0000000-0000-0000-0000-000000000001','est1@t.co','{"nombre":"Est Uno","fecha_nacimiento":"2000-01-01"}','{}'),
 ('a0000000-0000-0000-0000-000000000002','est2@t.co','{"nombre":"Est Dos","fecha_nacimiento":"2000-01-01"}','{}'),
 ('a0000000-0000-0000-0000-000000000003','doc@c.edu.co','{"nombre":"Docente"}','{"rol":"educador"}');

-- Estudiante 1: conversación de guía + mensajes
set local role authenticated;
select pg_temp.como('a0000000-0000-0000-0000-000000000001');
insert into public.conversaciones_ia (id, perfil_id, tipo, titulo) values ('d0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','guia','Mi primera charla');
insert into public.mensajes_ia_guia (perfil_id, autor, texto, conversacion_id) values
 ('a0000000-0000-0000-0000-000000000001','estudiante','¿Cómo ahorro?','d0000000-0000-0000-0000-000000000001'),
 ('a0000000-0000-0000-0000-000000000001','guia','Empieza por una meta pequeña.','d0000000-0000-0000-0000-000000000001');
select pg_temp.afirmar((select count(*) = 2 from public.mensajes_ia_guia), 'estudiante ve sus 2 mensajes');

-- Estudiante NO puede crear conversaciones educativas ni escribir historial educativo
select pg_temp.afirmar(pg_temp.falla($q$ insert into public.conversaciones_ia (perfil_id, tipo) values ('a0000000-0000-0000-0000-000000000001','educativa') $q$), 'estudiante NO crea conversación educativa');
select pg_temp.afirmar(pg_temp.falla($q$ insert into public.mensajes_ia_educativa (educador_id, conversacion_id, autor, texto)
  values ('a0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','educador','x') $q$), 'estudiante NO escribe historial educativo');

-- Estudiante 2 no ve nada del 1 ni puede inyectar en su conversación
select pg_temp.como('a0000000-0000-0000-0000-000000000002');
select pg_temp.afirmar((select count(*) = 0 from public.mensajes_ia_guia), 'estudiante 2 no ve mensajes ajenos');
select pg_temp.afirmar((select count(*) = 0 from public.conversaciones_ia), 'estudiante 2 no ve conversaciones ajenas');
select pg_temp.afirmar(pg_temp.falla($q$ insert into public.mensajes_ia_guia (perfil_id, autor, texto, conversacion_id)
  values ('a0000000-0000-0000-0000-000000000002','estudiante','intruso','d0000000-0000-0000-0000-000000000001') $q$), 'no inyecta en conversación ajena');
select pg_temp.afirmar(pg_temp.falla($q$ insert into public.mensajes_ia_guia (perfil_id, autor, texto)
  values ('a0000000-0000-0000-0000-000000000001','guia','suplantación') $q$), 'no escribe mensajes a nombre de otro');

-- Educador: guía propia + IA educativa propia, separadas
select pg_temp.como('a0000000-0000-0000-0000-000000000003');
insert into public.conversaciones_ia (id, perfil_id, tipo, titulo) values
 ('d0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000003','educativa','Estrategias 10-A'),
 ('d0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000003','guia','Guía del docente');
insert into public.mensajes_ia_educativa (educador_id, conversacion_id, autor, texto) values
 ('a0000000-0000-0000-0000-000000000003','d0000000-0000-0000-0000-000000000002','educador','¿Cómo refuerzo el ahorro?'),
 ('a0000000-0000-0000-0000-000000000003','d0000000-0000-0000-0000-000000000002','ia','Propón retos en parejas.');
insert into public.mensajes_ia_guia (perfil_id, autor, texto, conversacion_id)
 values ('a0000000-0000-0000-0000-000000000003','estudiante','¿Qué hay en el juego?','d0000000-0000-0000-0000-000000000003');
select pg_temp.afirmar((select count(*) = 2 from public.mensajes_ia_educativa), 'educador ve su historial educativo');
select pg_temp.afirmar((select count(*) = 1 from public.mensajes_ia_guia), 'educador ve solo SU historial de guía');
-- Un mensaje de guía no puede colgar de una conversación educativa, ni al revés
select pg_temp.afirmar(pg_temp.falla($q$ insert into public.mensajes_ia_guia (perfil_id, autor, texto, conversacion_id)
  values ('a0000000-0000-0000-0000-000000000003','estudiante','x','d0000000-0000-0000-0000-000000000002') $q$), 'guía no cuelga de conversación educativa');
select pg_temp.afirmar(pg_temp.falla($q$ insert into public.mensajes_ia_educativa (educador_id, conversacion_id, autor, texto)
  values ('a0000000-0000-0000-0000-000000000003','d0000000-0000-0000-0000-000000000003','educador','x') $q$), 'educativa no cuelga de conversación de guía');

-- Estudiantes no ven el historial educativo; borrar conversación elimina mensajes en cascada
select pg_temp.como('a0000000-0000-0000-0000-000000000001');
select pg_temp.afirmar((select count(*) = 0 from public.mensajes_ia_educativa), 'estudiante no ve historial educativo');
select pg_temp.como('a0000000-0000-0000-0000-000000000003');
delete from public.conversaciones_ia where id = 'd0000000-0000-0000-0000-000000000002';
select pg_temp.afirmar((select count(*) = 0 from public.mensajes_ia_educativa), 'borrar conversación borra sus mensajes');
reset role;
rollback;
\echo '  ✔ 40_ia_historial: todas las afirmaciones pasaron'
