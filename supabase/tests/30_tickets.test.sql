-- Pruebas de 0022: tickets de soporte (RLS y reglas de estado).
begin;
create or replace function pg_temp.afirmar(cond boolean, msg text) returns void language plpgsql as $$ begin if not coalesce(cond,false) then raise exception 'FALLÓ: %', msg; end if; end $$;
create or replace function pg_temp.como(uid text) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub', coalesce(uid,''), true); end $$;
create or replace function pg_temp.falla(q text) returns boolean language plpgsql as $$ begin execute q; return false; exception when others then return true; end $$;

insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
 ('a0000000-0000-0000-0000-000000000001','u1@t.co','{"nombre":"Usuario Uno","fecha_nacimiento":"2000-01-01"}','{}'),
 ('a0000000-0000-0000-0000-000000000002','u2@t.co','{"nombre":"Usuario Dos","fecha_nacimiento":"2000-01-01"}','{}'),
 ('a0000000-0000-0000-0000-000000000005','adm@t.co','{"nombre":"Admin"}','{"rol":"administrador"}');

-- Usuario 1 crea un ticket
set local role authenticated;
select pg_temp.como('a0000000-0000-0000-0000-000000000001');
insert into public.tickets_soporte (asunto, categoria, descripcion, prioridad, pagina)
values ('No carga el mapa','error_tecnico','El mapa se queda en blanco al abrir.','alta','/dashboard');
-- El cliente no elige el id: se fija como superusuario solo para que la prueba sea legible.
reset role;
update public.tickets_soporte set id = 'c0000000-0000-0000-0000-000000000001' where asunto = 'No carga el mapa';
set local role authenticated;
select pg_temp.como('a0000000-0000-0000-0000-000000000001');
select pg_temp.afirmar((select estado = 'abierto' and usuario_id = 'a0000000-0000-0000-0000-000000000001'
  from public.tickets_soporte where id = 'c0000000-0000-0000-0000-000000000001'), 'ticket nace abierto y a nombre del usuario');

-- No puede crear a nombre de otro, ni fijar estado/asignado, ni actualizar/borrar
select pg_temp.afirmar(pg_temp.falla($q$ insert into public.tickets_soporte (usuario_id, asunto, descripcion)
  values ('a0000000-0000-0000-0000-000000000002','Suplanto','descripción suficientemente larga') $q$), 'no crea ticket a nombre de otro');
select pg_temp.afirmar(pg_temp.falla($q$ insert into public.tickets_soporte (asunto, descripcion, estado)
  values ('Cerrado de entrada','descripción suficientemente larga','cerrado') $q$), 'no fija estado al crear');
select pg_temp.afirmar(pg_temp.falla($q$ insert into public.tickets_soporte (asunto, descripcion, administrador_asignado_id)
  values ('Asignado','descripción suficientemente larga','a0000000-0000-0000-0000-000000000005') $q$), 'no fija asignado al crear');
select pg_temp.afirmar(pg_temp.falla($q$ update public.tickets_soporte set estado = 'cerrado' $q$), 'usuario NO cambia estado directo');
select pg_temp.afirmar(pg_temp.falla($q$ delete from public.tickets_soporte $q$), 'usuario NO borra tickets');
select pg_temp.afirmar(pg_temp.falla($q$ insert into public.tickets_mensajes (ticket_id, autor_id, autor_rol, mensaje)
  values ('c0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','administrador','Me hago pasar por admin') $q$), 'usuario NO inserta mensajes directo');
select pg_temp.afirmar(pg_temp.falla($q$ select public.gestionar_ticket('c0000000-0000-0000-0000-000000000001','cerrado') $q$), 'usuario NO ejecuta gestionar_ticket');

-- Usuario 1 responde
select public.responder_ticket('c0000000-0000-0000-0000-000000000001','Sigue pasando en el celular.');
select pg_temp.afirmar((select count(*) = 1 from public.tickets_mensajes), 'usuario ve su mensaje');

-- Usuario 2 no ve ni responde el ticket ajeno
select pg_temp.como('a0000000-0000-0000-0000-000000000002');
select pg_temp.afirmar((select count(*) = 0 from public.tickets_soporte), 'usuario 2 no ve tickets ajenos');
select pg_temp.afirmar((select count(*) = 0 from public.tickets_mensajes), 'usuario 2 no ve mensajes ajenos');
select pg_temp.afirmar(pg_temp.falla($q$ select public.responder_ticket('c0000000-0000-0000-0000-000000000001','intruso') $q$), 'usuario 2 NO responde ticket ajeno');

-- Administrador ve todo, responde, gestiona
select pg_temp.como('a0000000-0000-0000-0000-000000000005');
select pg_temp.afirmar((select count(*) = 1 from public.tickets_soporte), 'admin ve tickets');
select public.responder_ticket('c0000000-0000-0000-0000-000000000001','Estamos revisando, gracias.');
select pg_temp.afirmar((select estado = 'respondido' and administrador_asignado_id = 'a0000000-0000-0000-0000-000000000005'
  from public.tickets_soporte), 'respuesta del admin → respondido y asignado');
select public.gestionar_ticket('c0000000-0000-0000-0000-000000000001', p_prioridad => 'urgente');
select pg_temp.afirmar(pg_temp.falla($q$ select public.gestionar_ticket('c0000000-0000-0000-0000-000000000001','inventado') $q$), 'estado inválido rechazado');
select pg_temp.afirmar(pg_temp.falla($q$ select public.gestionar_ticket('c0000000-0000-0000-0000-000000000001', p_asignado_id => 'a0000000-0000-0000-0000-000000000001', p_asignar => true) $q$), 'no se asigna a un no-admin');

-- Usuario responde a un "respondido" → vuelve a abierto
select pg_temp.como('a0000000-0000-0000-0000-000000000001');
select public.responder_ticket('c0000000-0000-0000-0000-000000000001','Gracias, quedo atento.');
select pg_temp.afirmar((select estado = 'abierto' from public.tickets_soporte), 'usuario responde a respondido → abierto');

-- Cierre
select pg_temp.como('a0000000-0000-0000-0000-000000000005');
select public.gestionar_ticket('c0000000-0000-0000-0000-000000000001','cerrado');
select pg_temp.afirmar((select estado = 'cerrado' and cerrado_en is not null from public.tickets_soporte), 'admin cierra y fija cerrado_en');
select pg_temp.como('a0000000-0000-0000-0000-000000000001');
select pg_temp.afirmar(pg_temp.falla($q$ select public.responder_ticket('c0000000-0000-0000-0000-000000000001','ya cerrado') $q$), 'usuario NO responde ticket cerrado');
-- Reapertura por el admin
select pg_temp.como('a0000000-0000-0000-0000-000000000005');
select public.gestionar_ticket('c0000000-0000-0000-0000-000000000001','en_proceso');
select pg_temp.afirmar((select estado = 'en_proceso' and cerrado_en is null from public.tickets_soporte), 'admin reabre y limpia cerrado_en');
reset role;
select pg_temp.afirmar((select count(*) >= 2 from public.actividad_sistema where accion = 'ticket_gestionado'), 'gestionar_ticket deja auditoría');

-- anon no accede a nada
set local role anon;
select pg_temp.como(null);
select pg_temp.afirmar(pg_temp.falla($q$ select count(*) from public.tickets_soporte $q$), 'anon sin acceso a tickets');
select pg_temp.afirmar(pg_temp.falla($q$ select public.responder_ticket('c0000000-0000-0000-0000-000000000001','x') $q$), 'anon sin acceso a responder_ticket');
reset role;
rollback;
\echo '  ✔ 30_tickets: todas las afirmaciones pasaron'
