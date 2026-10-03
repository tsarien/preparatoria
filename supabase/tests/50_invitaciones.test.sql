-- Pruebas de 0021: invitaciones vigentes únicas, revocación y acceso restringido.
begin;
create or replace function pg_temp.afirmar(cond boolean, msg text) returns void language plpgsql as $$ begin if not coalesce(cond,false) then raise exception 'FALLÓ: %', msg; end if; end $$;
create or replace function pg_temp.falla(q text) returns boolean language plpgsql as $$ begin execute q; return false; exception when others then return true; end $$;

insert into public.colegios (id, nombre) values ('11111111-1111-1111-1111-111111111111','Colegio X');
select public.crear_invitacion_educador('11111111-1111-1111-1111-111111111111','Doc@Colegio.edu.co', repeat('a',64));
select pg_temp.afirmar((select correo_institucional = 'doc@colegio.edu.co' from public.invitaciones_educador where codigo_hash = repeat('a',64)), 'correo normalizado a minúsculas');
-- Segunda vigente para el mismo correo/colegio → rechazada
select pg_temp.afirmar(pg_temp.falla($q$ select public.crear_invitacion_educador('11111111-1111-1111-1111-111111111111','doc@colegio.edu.co', repeat('b',64)) $q$), 'no hay dos invitaciones vigentes para el mismo correo');
-- Revocar y regenerar
update public.invitaciones_educador set revocada_en = now() where codigo_hash = repeat('a',64);
select public.crear_invitacion_educador('11111111-1111-1111-1111-111111111111','doc@colegio.edu.co', repeat('b',64));
select pg_temp.afirmar((select count(*) = 2 from public.invitaciones_educador), 'tras revocar se puede regenerar');
-- Hash inválido / correo inválido / colegio inexistente
select pg_temp.afirmar(pg_temp.falla($q$ select public.crear_invitacion_educador('11111111-1111-1111-1111-111111111111','x@y.co','no-es-hash') $q$), 'hash inválido rechazado');
select pg_temp.afirmar(pg_temp.falla($q$ select public.crear_invitacion_educador(gen_random_uuid(),'x@y.co', repeat('d',64)) $q$), 'colegio inexistente rechazado');
-- Clientes sin acceso a la tabla ni a la función
set local role authenticated;
select pg_temp.afirmar(pg_temp.falla($q$ select * from public.invitaciones_educador $q$), 'authenticated sin acceso a invitaciones');
select pg_temp.afirmar(pg_temp.falla($q$ select public.crear_invitacion_educador('11111111-1111-1111-1111-111111111111','z@y.co', repeat('e',64)) $q$), 'authenticated no crea invitaciones');
reset role;
set local role anon;
select pg_temp.afirmar(pg_temp.falla($q$ select * from public.invitaciones_educador $q$), 'anon sin acceso a invitaciones');
reset role;
rollback;
\echo '  ✔ 50_invitaciones: todas las afirmaciones pasaron'
