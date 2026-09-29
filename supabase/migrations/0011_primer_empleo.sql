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