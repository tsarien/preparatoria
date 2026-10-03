-- Pruebas de 0020: es_administrador, colegios/cursos (RLS), actividad_sistema, perfiles y actualizar_perfil.
begin;

create or replace function pg_temp.afirmar(cond boolean, msg text) returns void
language plpgsql as $$ begin if not coalesce(cond, false) then raise exception 'FALLÓ: %', msg; end if; end $$;
create or replace function pg_temp.como(uid text) returns void language plpgsql as
$$ begin perform set_config('request.jwt.claim.sub', coalesce(uid, ''), true); end $$;
-- Intenta ejecutar sql; devuelve true si lanzó error (p. ej. permiso denegado).
create or replace function pg_temp.falla(q text) returns boolean language plpgsql as
$$ begin execute q; return false; exception when others then return true; end $$;

insert into public.colegios (id, nombre) values
 ('11111111-1111-1111-1111-111111111111', 'Colegio Activo'),
 ('22222222-2222-2222-2222-222222222222', 'Colegio Inactivo');
update public.colegios set activo = false where id = '22222222-2222-2222-2222-222222222222';
insert into public.cursos_colegio (colegio_id, nombre, activo) values
 ('11111111-1111-1111-1111-111111111111', '10-A', true),
 ('11111111-1111-1111-1111-111111111111', '11-B', true),
 ('11111111-1111-1111-1111-111111111111', 'Archivado', false),
 ('22222222-2222-2222-2222-222222222222', '9-A', true);

insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
 ('a0000000-0000-0000-0000-000000000001', 'est@test.co',
   '{"nombre":"Estudiante Uno","fecha_nacimiento":"2000-01-01","colegio_id":"11111111-1111-1111-1111-111111111111"}', '{}'),
 ('a0000000-0000-0000-0000-000000000002', 'est2@test.co',
   '{"nombre":"Estudiante Dos","fecha_nacimiento":"2000-01-01","colegio_id":"11111111-1111-1111-1111-111111111111"}', '{}'),
 ('a0000000-0000-0000-0000-000000000005', 'admin@test.co', '{"nombre":"Admin"}', '{"rol":"administrador"}');

-- es_administrador
set local role authenticated;
select pg_temp.como('a0000000-0000-0000-0000-000000000005');
select pg_temp.afirmar(public.es_administrador(), 'es_administrador: admin = true');
select pg_temp.como('a0000000-0000-0000-0000-000000000001');
select pg_temp.afirmar(not public.es_administrador(), 'es_administrador: estudiante = false');
select pg_temp.como(null);
select pg_temp.afirmar(not public.es_administrador(), 'es_administrador: sin sesión = false');
reset role;

-- Administrador inactivo deja de serlo
update public.perfiles set activo = false where id = 'a0000000-0000-0000-0000-000000000005';
set local role authenticated;
select pg_temp.como('a0000000-0000-0000-0000-000000000005');
select pg_temp.afirmar(not public.es_administrador(), 'es_administrador: admin inactivo = false');
reset role;
update public.perfiles set activo = true where id = 'a0000000-0000-0000-0000-000000000005';

-- Lectura pública (anon): solo colegios y cursos activos
set local role anon;
select pg_temp.como(null);
select pg_temp.afirmar(exists (select 1 from public.colegios where id = '11111111-1111-1111-1111-111111111111')
  and not exists (select 1 from public.colegios where id = '22222222-2222-2222-2222-222222222222'), 'anon ve colegios activos y no los inactivos');
select pg_temp.afirmar((select count(*) = 2 from public.cursos_colegio), 'anon ve solo cursos activos de colegios activos');
select pg_temp.afirmar(pg_temp.falla($q$ insert into public.colegios (nombre) values ('Hack') $q$), 'anon NO inserta colegios');
select pg_temp.afirmar(pg_temp.falla($q$ insert into public.cursos_colegio (colegio_id, nombre) values ('11111111-1111-1111-1111-111111111111','X') $q$), 'anon NO inserta cursos');
reset role;

-- Estudiante autenticado: no escribe colegios/cursos ni lee actividad ni perfiles ajenos
set local role authenticated;
select pg_temp.como('a0000000-0000-0000-0000-000000000001');
select pg_temp.afirmar(pg_temp.falla($q$ update public.colegios set nombre = 'Hack' $q$), 'estudiante NO actualiza colegios');
select pg_temp.afirmar(pg_temp.falla($q$ delete from public.cursos_colegio $q$), 'estudiante NO borra cursos');
select pg_temp.afirmar((select count(*) = 0 from public.actividad_sistema), 'estudiante NO lee actividad_sistema');
select pg_temp.afirmar((select count(*) = 1 from public.perfiles), 'estudiante solo ve su propio perfil');
reset role;

insert into public.actividad_sistema (actor_id, accion, entidad, detalle)
values ('a0000000-0000-0000-0000-000000000005', 'colegio_creado', 'colegio', 'Colegio Activo');

set local role authenticated;
select pg_temp.como('a0000000-0000-0000-0000-000000000005');
select pg_temp.afirmar((select count(*) = 1 from public.actividad_sistema), 'admin lee actividad_sistema');
select pg_temp.afirmar((select count(*) >= 3 from public.perfiles), 'admin lee todos los perfiles');
select pg_temp.afirmar(pg_temp.falla($q$ insert into public.actividad_sistema (accion, entidad) values ('x','y') $q$), 'admin NO inserta actividad directo (solo servidor)');
reset role;

-- actualizar_perfil: curso del colegio y colegio activo
set local role authenticated;
select pg_temp.como('a0000000-0000-0000-0000-000000000001');
select pg_temp.afirmar(pg_temp.falla($q$ select public.actualizar_perfil('Estudiante Uno','99-Z','11111111-1111-1111-1111-111111111111','avatar_01') $q$),
  'actualizar_perfil rechaza curso que no es del colegio');
select pg_temp.afirmar(pg_temp.falla($q$ select public.actualizar_perfil('Estudiante Uno','Archivado','11111111-1111-1111-1111-111111111111','avatar_01') $q$),
  'actualizar_perfil rechaza curso archivado');
select pg_temp.afirmar(pg_temp.falla($q$ select public.actualizar_perfil('Estudiante Uno','9-A','22222222-2222-2222-2222-222222222222','avatar_01') $q$),
  'actualizar_perfil rechaza colegio inactivo');
select public.actualizar_perfil('Estudiante Uno','10-A','11111111-1111-1111-1111-111111111111','avatar_05');
reset role;
select pg_temp.afirmar((select curso = '10-A' and avatar_id = 'avatar_05' from public.perfiles
  where id = 'a0000000-0000-0000-0000-000000000001'), 'actualizar_perfil guarda curso y avatar válidos');

-- El administrador no puede cambiarse de colegio desde el perfil
set local role authenticated;
select pg_temp.como('a0000000-0000-0000-0000-000000000005');
select pg_temp.afirmar(pg_temp.falla($q$ select public.actualizar_perfil('Admin','', '11111111-1111-1111-1111-111111111111','avatar_01') $q$),
  'administrador no cambia de colegio');
reset role;

rollback;
\echo '  ✔ 20_admin_cursos: todas las afirmaciones pasaron'
