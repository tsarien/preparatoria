-- Pruebas del trigger definitivo handle_new_user() (migración 0019).
-- Cada caso inserta en auth.users como lo haría GoTrue y verifica perfil/personaje.
begin;

create or replace function pg_temp.afirmar(cond boolean, msg text) returns void
language plpgsql as $$ begin if not coalesce(cond, false) then raise exception 'FALLÓ: %', msg; end if; end $$;

insert into public.colegios (id, nombre, ciudad, codigo_institucional)
values ('11111111-1111-1111-1111-111111111111', 'Colegio Test', 'Bogotá', 'TEST-001');

-- 1) Estudiante mayor de edad: consentimiento aprobado, personaje normal, sin solicitud.
insert into auth.users (id, email, raw_user_meta_data) values
 ('a0000000-0000-0000-0000-000000000001', 'adulto@test.co',
  jsonb_build_object('nombre','Ana Adulta','fecha_nacimiento','2000-01-01',
    'colegio_id','11111111-1111-1111-1111-111111111111','curso','11-A'));
select pg_temp.afirmar((select rol = 'estudiante' and consentimiento_acudiente = 'aprobado'
  from public.perfiles where id = 'a0000000-0000-0000-0000-000000000001'), 'estudiante mayor: rol/consentimiento');
select pg_temp.afirmar((select modo_juego = 'estudiante' from public.personajes
  where usuario_id = 'a0000000-0000-0000-0000-000000000001'), 'estudiante mayor: personaje normal');
select pg_temp.afirmar(not exists (select 1 from public.solicitudes_consentimiento
  where perfil_id = 'a0000000-0000-0000-0000-000000000001'), 'estudiante mayor: sin solicitud');

-- 2) Estudiante menor: consentimiento pendiente y solicitud creada.
insert into auth.users (id, email, raw_user_meta_data) values
 ('a0000000-0000-0000-0000-000000000002', 'menor@test.co',
  jsonb_build_object('nombre','Mario Menor',
    'fecha_nacimiento', to_char(current_date - interval '16 years', 'YYYY-MM-DD'),
    'correo_acudiente','acudiente@test.co','colegio_id','11111111-1111-1111-1111-111111111111'));
select pg_temp.afirmar((select consentimiento_acudiente = 'pendiente'
  from public.perfiles where id = 'a0000000-0000-0000-0000-000000000002'), 'menor: pendiente');
select pg_temp.afirmar(exists (select 1 from public.solicitudes_consentimiento
  where perfil_id = 'a0000000-0000-0000-0000-000000000002'), 'menor: solicitud creada');

-- 3) Estudiante sin fecha de nacimiento o con fecha inválida/futura: el alta se RECHAZA.
do $$ begin
  begin
    insert into auth.users (id, email, raw_user_meta_data)
    values (gen_random_uuid(), 'sinfecha@test.co', '{"nombre":"Sin Fecha"}');
    raise exception 'FALLÓ: se permitió un estudiante sin fecha de nacimiento';
  exception when sqlstate '22023' then null; end;
  begin
    insert into auth.users (id, email, raw_user_meta_data)
    values (gen_random_uuid(), 'futura@test.co',
      jsonb_build_object('nombre','Futuro','fecha_nacimiento', to_char(current_date + 5, 'YYYY-MM-DD')));
    raise exception 'FALLÓ: se permitió una fecha futura';
  exception when sqlstate '22023' then null; end;
  begin
    insert into auth.users (id, email, raw_user_meta_data)
    values (gen_random_uuid(), 'basura@test.co', '{"nombre":"Basura","fecha_nacimiento":"no-es-fecha"}');
    raise exception 'FALLÓ: se permitió una fecha malformada';
  exception when sqlstate '22023' then null; end;
end $$;

-- 4) Educador por invitación consumida (flujo real del registro): rol educador,
--    colegio de la invitación, personaje de demostración y sin solicitud de consentimiento.
insert into public.invitaciones_educador (id, colegio_id, correo_institucional, codigo_hash, expira_en, usada_en)
values ('b0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
        'docente@colegio.edu.co', repeat('a', 64), now() + interval '7 days', now());
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
 ('a0000000-0000-0000-0000-000000000003', 'docente@colegio.edu.co',
  jsonb_build_object('nombre','Doña Docente','cargo_educativo','Docente','area_educativa','Matemáticas',
                     'cursos_educativos', jsonb_build_array('10-A','11-B')),
  '{"rol":"educador","colegio_id":"11111111-1111-1111-1111-111111111111"}');
select pg_temp.afirmar((select rol = 'educador' and colegio_id = '11111111-1111-1111-1111-111111111111'
  and cursos_educativos = array['10-A','11-B'] from public.perfiles
  where id = 'a0000000-0000-0000-0000-000000000003'), 'educador: rol/colegio/cursos');
select pg_temp.afirmar((select modo_juego = 'educador_demo' from public.personajes
  where usuario_id = 'a0000000-0000-0000-0000-000000000003'), 'educador: personaje de demostración');
select pg_temp.afirmar((select usuario_id = 'a0000000-0000-0000-0000-000000000003'
  from public.invitaciones_educador where id = 'b0000000-0000-0000-0000-000000000001'), 'educador: invitación vinculada');
select pg_temp.afirmar(not exists (select 1 from public.solicitudes_consentimiento
  where perfil_id = 'a0000000-0000-0000-0000-000000000003'), 'educador: sin solicitud');

-- 5) Educador solo con invitación consumida (sin app_metadata): también debe ser educador.
insert into public.invitaciones_educador (id, colegio_id, correo_institucional, codigo_hash, expira_en, usada_en)
values ('b0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
        'otro@colegio.edu.co', repeat('b', 64), now() + interval '7 days', now());
insert into auth.users (id, email, raw_user_meta_data) values
 ('a0000000-0000-0000-0000-000000000004', 'otro@colegio.edu.co', '{"nombre":"Otro Docente"}');
select pg_temp.afirmar((select rol = 'educador' from public.perfiles
  where id = 'a0000000-0000-0000-0000-000000000004'), 'educador por invitación sin app_metadata');

-- 6) Administrador (solo por app_metadata, que únicamente escribe la service-role): sin personaje ni colegio.
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
 ('a0000000-0000-0000-0000-000000000005', 'admin@test.co', '{"nombre":"Admin Test"}', '{"rol":"administrador"}');
select pg_temp.afirmar((select rol = 'administrador' and colegio_id is null and activo
  from public.perfiles where id = 'a0000000-0000-0000-0000-000000000005'), 'administrador: rol');
select pg_temp.afirmar(not exists (select 1 from public.personajes
  where usuario_id = 'a0000000-0000-0000-0000-000000000005'), 'administrador: sin personaje');

-- 7) Escalada de privilegios: user_metadata editable por el cliente NUNCA otorga rol.
insert into auth.users (id, email, raw_user_meta_data) values
 ('a0000000-0000-0000-0000-000000000006', 'hacker@test.co',
  jsonb_build_object('nombre','Hacker','rol','administrador','fecha_nacimiento','2001-05-05'));
select pg_temp.afirmar((select rol = 'estudiante' from public.perfiles
  where id = 'a0000000-0000-0000-0000-000000000006'), 'user_metadata no puede dar rol administrador');

-- 8) Ranking: el educador (personaje demo) y los inactivos no aparecen; devuelve avatar y "yo".
update public.personajes set xp = 900 where usuario_id = 'a0000000-0000-0000-0000-000000000003';
update public.personajes set xp = 100 where usuario_id = 'a0000000-0000-0000-0000-000000000001';
update public.perfiles set colegio_id = '11111111-1111-1111-1111-111111111111', avatar_id = 'avatar_03'
 where id = 'a0000000-0000-0000-0000-000000000001';
update public.perfiles set colegio_id = '11111111-1111-1111-1111-111111111111'
 where id = 'a0000000-0000-0000-0000-000000000002';
update public.perfiles set activo = false where id = 'a0000000-0000-0000-0000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000001', true);
select pg_temp.afirmar((select count(*) = 1 from public.obtener_ranking_colegio()), 'ranking: solo el estudiante activo');
select pg_temp.afirmar((select avatar_id = 'avatar_03' and es_usuario_actual from public.obtener_ranking_colegio()), 'ranking: avatar y es_usuario_actual');
-- Un educador no ve el ranking de estudiantes (es vista de estudiante).
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000003', true);
select pg_temp.afirmar((select count(*) = 0 from public.obtener_ranking_colegio()), 'ranking: el educador no lo consulta');
reset role;

-- 9) El cron de eventos no genera eventos para personajes de demostración.
select setseed(0.5);
do $$ begin for i in 1..30 loop perform public.generar_eventos_diarios(); end loop; end $$;
select pg_temp.afirmar(not exists (select 1 from public.eventos_aleatorios e join public.personajes p on p.id = e.personaje_id
  where p.modo_juego = 'educador_demo'), 'cron: sin eventos para personaje de demostración');

rollback;
\echo '  ✔ 10_trigger_roles: todas las afirmaciones pasaron'
