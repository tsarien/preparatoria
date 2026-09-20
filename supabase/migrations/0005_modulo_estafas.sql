-- preparatorIA — Fase 4: módulo "Detectar estafas"
-- Ejecuta este archivo en Supabase > SQL Editor (después de 0001-0004)

insert into public.modulos (slug, grupo, nombre, descripcion, orden, estado)
values (
  'detectar-estafas',
  'seguridad_digital',
  'Detectar estafas',
  'Practica con mensajes, correos e "inversiones" — algunos son estafas reales, otros no. Aprende a distinguirlos.',
  2,
  'mvp'
)
on conflict (slug) do nothing;

-- 1. Premio sospechoso (SMS) — ESTAFA
insert into public.retos (modulo_id, slug, nombre, tipo, dificultad, orden, config)
select id, 'premio-sospechoso', 'Te ganaste un premio', 'deteccion_estafa', 'facil', 1,
'{
  "canal": "sms",
  "remitente": "+57 300 XXX XXXX",
  "mensaje_inicial": "¡Felicidades! 🎉 Fuiste seleccionado para reclamar un iPhone 17 GRATIS. Solo debes pagar $45.000 de envío aquí: bit.ly/premio-ya. Tienes 30 minutos antes de perder el premio.",
  "es_estafa": true,
  "monto_en_riesgo": 45000,
  "senales_clave": [
    "Un premio de un sorteo en el que nunca participaste",
    "Te piden pagar plata para reclamar algo \"gratis\"",
    "Link acortado y desconocido",
    "Presión de tiempo (30 minutos)"
  ],
  "interactivo": true,
  "descripcion_personaje": "Alguien que te escribe por SMS avisando que ganaste un premio, y presiona para que pagues un \"envío\" rápido antes de que se acabe el tiempo."
}'::jsonb
from public.modulos where slug = 'detectar-estafas'
on conflict (slug) do nothing;

-- 2. Correo de banco falso — ESTAFA (phishing)
insert into public.retos (modulo_id, slug, nombre, tipo, dificultad, orden, config)
select id, 'correo-banco-falso', 'Tu cuenta bancaria', 'deteccion_estafa', 'medio', 2,
'{
  "canal": "correo",
  "remitente": "seguridad@bancolomb-verificacion.com",
  "mensaje_inicial": "Estimado cliente, detectamos actividad inusual en su cuenta. Para evitar el bloqueo, verifique sus datos en el siguiente enlace dentro de las próximas 24 horas: verificacion-bancolombia-segura.com/login",
  "es_estafa": true,
  "monto_en_riesgo": 300000,
  "senales_clave": [
    "El dominio del correo no es el del banco real",
    "Urgencia y amenaza de bloqueo",
    "Piden \"verificar\" la clave en un link — un banco real nunca hace esto",
    "Saludo genérico (\"Estimado cliente\") en vez de tu nombre"
  ],
  "interactivo": true,
  "descripcion_personaje": "Alguien haciéndose pasar por \"seguridad\" de un banco, insistiendo en que hay un problema urgente con tu cuenta y presionando para que entres a un link y pongas tu clave."
}'::jsonb
from public.modulos where slug = 'detectar-estafas'
on conflict (slug) do nothing;

-- 3. "Triplica tu plata" — ESTAFA (esquema de inversión)
insert into public.retos (modulo_id, slug, nombre, tipo, dificultad, orden, config)
select id, 'invierte-triplica', 'Triplica tu plata', 'deteccion_estafa', 'medio', 3,
'{
  "canal": "mensaje",
  "remitente": "Grupo de WhatsApp \"Inversiones Fáciles 💰\"",
  "mensaje_inicial": "Parce, únete a nuestro grupo de inversión. En 1 semana triplicas lo que pongas, ya varios del colegio están ganando plata. Solo necesitas empezar con $200.000. ¿Te metes?",
  "es_estafa": true,
  "monto_en_riesgo": 200000,
  "senales_clave": [
    "Promesa de ganancia garantizada y rápida — nadie puede prometer eso",
    "Presión social (\"ya varios del colegio están ganando\")",
    "Nunca explican en qué invierten realmente",
    "Te empujan a poner dinero ya mismo"
  ],
  "interactivo": true,
  "descripcion_personaje": "Un conocido del colegio que te invita a un \"grupo de inversión\" prometiendo triplicar tu plata rápido, usando presión social para que te metas ya."
}'::jsonb
from public.modulos where slug = 'detectar-estafas'
on conflict (slug) do nothing;

-- 4. Aviso del colegio — LEGÍTIMO (no todo es estafa)
insert into public.retos (modulo_id, slug, nombre, tipo, dificultad, orden, config)
select id, 'correo-colegio', 'Aviso del colegio', 'deteccion_estafa', 'facil', 4,
'{
  "canal": "correo",
  "remitente": "coordinacion@tucolegio.edu.co",
  "mensaje_inicial": "Recordatorio: mañana martes hay reunión de padres de familia a las 6:00pm en el auditorio principal. No se requiere confirmar asistencia. Cualquier duda, comunícate en horario escolar.",
  "es_estafa": false,
  "monto_en_riesgo": null,
  "senales_clave": [
    "El dominio del correo es el del colegio real",
    "No pide dinero ni datos personales",
    "No genera urgencia ni presión",
    "Es información que puedes verificar directamente con el colegio"
  ],
  "interactivo": false,
  "descripcion_personaje": null
}'::jsonb
from public.modulos where slug = 'detectar-estafas'
on conflict (slug) do nothing;
