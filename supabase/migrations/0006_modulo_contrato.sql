-- preparatorIA — Fase 5: módulo "Contrato de arriendo"
-- Ejecuta este archivo en Supabase > SQL Editor (después de 0001-0005)

insert into public.modulos (slug, grupo, nombre, descripcion, orden, estado)
values (
  'contrato-arriendo',
  'vida_independiente',
  'Contrato de arriendo',
  'Lee un contrato de arriendo real (ficticio, pero realista), detecta cláusulas abusivas, y practica negociar con el arrendador.',
  3,
  'mvp'
)
on conflict (slug) do nothing;

-- 1. Leer el contrato: preguntas de comprensión + detectar cláusulas preocupantes
insert into public.retos (modulo_id, slug, nombre, tipo, dificultad, orden, config)
select id, 'leer-contrato', 'Lee el contrato', 'lectura_contrato', 'medio', 1,
'{
  "clausulas": [
    {"id": "canon", "texto": "Canon mensual: $900.000, pagadero dentro de los primeros 5 días de cada mes.", "preocupante": false},
    {"id": "deposito", "texto": "Depósito: equivalente a 2 meses de canon ($1.800.000), reembolsable al finalizar el contrato si el inmueble se entrega en buen estado.", "preocupante": false},
    {"id": "incremento", "texto": "El canon se incrementará cada año según el IPC más 3 puntos porcentuales adicionales.", "preocupante": true},
    {"id": "reparaciones", "texto": "Todas las reparaciones del inmueble, incluidas las estructurales, correrán por cuenta del arrendatario.", "preocupante": true},
    {"id": "mora", "texto": "En caso de mora en el pago, se cobrará un interés del 5% diario sobre el saldo pendiente.", "preocupante": true},
    {"id": "terminacion", "texto": "Si el arrendatario termina el contrato antes de los 12 meses, deberá pagar una multa equivalente a 3 meses de canon.", "preocupante": false},
    {"id": "duracion", "texto": "Duración: 12 meses, prorrogables automáticamente salvo aviso escrito con 30 días de anticipación.", "preocupante": false},
    {"id": "uso", "texto": "El inmueble se destinará exclusivamente para vivienda del arrendatario y su núcleo familiar.", "preocupante": false}
  ],
  "preguntas": [
    {"id": "q1", "texto": "¿Cuánto es el canon mensual?", "opciones": ["$700.000", "$900.000", "$1.800.000"], "respuesta_correcta": 1},
    {"id": "q2", "texto": "¿Con cuántos días de anticipación hay que avisar si no se quiere renovar el contrato?", "opciones": ["15 días", "30 días", "60 días"], "respuesta_correcta": 1},
    {"id": "q3", "texto": "Si te vas antes de los 12 meses, ¿qué pasa?", "opciones": ["No pasa nada", "Pierdes el depósito completo", "Pagas una multa de 3 meses de canon"], "respuesta_correcta": 2}
  ]
}'::jsonb
from public.modulos where slug = 'contrato-arriendo'
on conflict (slug) do nothing;

-- 2. Negociar con el arrendador: simulación conversacional
insert into public.retos (modulo_id, slug, nombre, tipo, dificultad, orden, config)
select id, 'negociar-arrendador', 'Negocia con el arrendador', 'simulacion_conversacional', 'medio', 2,
'{
  "mensaje_inicial": "Hola, soy Andrés Beltrán, el arrendador. Me dijiste que querías hablar sobre el contrato antes de firmarlo, ¿qué tienes en mente?",
  "punto_negociacion": "El depósito quedó en 2 meses de canon ($1.800.000). Tu misión: intenta negociar que sea de 1 mes ($900.000).",
  "descripcion_personaje": "Andrés Beltrán, el arrendador del apartamento: profesional y cordial, pero firme con sus condiciones al inicio. Puede ceder parcialmente (por ejemplo, a 1.5 meses, o a 1 mes si el estudiante ofrece un codeudor o buenas referencias) si le dan una razón real — no cede solo porque se lo pidan amablemente."
}'::jsonb
from public.modulos where slug = 'contrato-arriendo'
on conflict (slug) do nothing;
