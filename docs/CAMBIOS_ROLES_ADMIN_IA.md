# Cambios de la Fase 5 — decisiones y seguridad

## Decisión: fecha de nacimiento y consentimiento del acudiente

La fecha de nacimiento **sigue siendo obligatoria** en el registro de estudiante: es el dato que decide
si hace falta solicitar la autorización del acudiente (Ley 1581 de 2012). Se refuerza así:

- El servidor valida que sea una fecha real, no futura y plausible (`lib/registro.ts`).
- El trigger `handle_new_user()` **rechaza** el alta de un estudiante sin fecha válida (antes, una fecha vacía
  dejaba el consentimiento como `aprobado`). Así nadie se salta el consentimiento llamando a la API directamente.
- Para menores de 18 el correo del acudiente es obligatorio y **no puede ser el del propio estudiante**
  (un menor podría aprobarse a sí mismo).
- En Ajustes la fecha se muestra como solo lectura para estudiantes y no se muestra a educadores.
- `perfiles.fecha_nacimiento` sigue siendo `NULL`able porque los educadores no tienen fecha.

## Roles

El rol se decide solo con datos que el navegador no puede editar: `app_metadata.rol` (escribe únicamente la
service-role) o una invitación consumida por el backend. `user_metadata.rol` se ignora (hay prueba SQL).
El rol efectivo en la app sale de `public.perfiles.rol`.

## Educador en el juego

El educador juega con un personaje de práctica (`modo_juego = 'educador_demo'`). El ranking, el cron de eventos
y los reportes filtran por `rol = 'estudiante'` / `modo_juego = 'estudiante'`; su actividad nunca se mezcla con la de
estudiantes. `/dashboard` muestra el mapa en "modo demostración".

## Seguridad del administrador

- Cada Server Action y página administrativa llama a `autorizarAdmin()` / `requireAdmin()`: valida la sesión con
  `auth.getUser()` y `perfiles.rol = 'administrador'` y `activo`. Hay pruebas que demuestran que, sin ese permiso,
  **la service-role ni siquiera se instancia**.
- La service-role (`SUPABASE_SERVICE_ROLE_KEY`) solo se usa en archivos `server-only` y nunca lleva `NEXT_PUBLIC_`.
- Tickets: el usuario solo inserta columnas de contenido; responder, cambiar estado/prioridad, asignar y cerrar pasan por
  funciones `SECURITY DEFINER` que verifican `auth.uid()` y rol dentro de la base de datos.
- Invitaciones: código aleatorio de 12 caracteres, solo se guarda su hash SHA-256; se muestra una vez; se puede revocar y regenerar.
- Desactivar una cuenta marca `perfiles.activo = false` y bloquea el inicio de sesión en Supabase Auth (`ban_duration`);
  el layout además expulsa a cuentas inactivas.
- Eliminar una cuenta usa `eliminar_datos_usuario()` (borra el historial en el orden correcto) y luego Auth Admin `deleteUser`.

## IA

- **IA Guía** (estudiantes y educadores): `conversaciones_ia` + `mensajes_ia_guia`. Chat flotante global; el historial persiste
  en Supabase y se recupera al iniciar sesión. Se corrigió un error por el que, tras 60 mensajes, solo se mostraban los más viejos.
  El tope diario de mensajes sigue **deshabilitado** (como estaba); el código para activarlo está comentado en `guia/actions.ts`.
- **IA educativa** (solo educadores): `mensajes_ia_educativa`, historial propio y separado, con RLS.
- El proveedor de IA sigue siendo la capa existente (`lib/ai/providers`: Gemini/Groq/DeepSeek); no se añadió Anthropic.

## Fondo dinámico

`/login` se prerenderizaba de forma estática, congelando el fondo a la hora del build. `PaisajeFondo` ahora hace
`await connection()`, así que toda página que lo use se renderiza por petición (Home, login, registro, registro de educador).

## Pendientes / límites conocidos

- Las pruebas E2E no se pudieron ejecutar en el entorno de desarrollo (sin navegador); la corrección visual del HUD a 320 px
  debe confirmarse con `npm run test:e2e` o a ojo.
- Los avatares siguen dibujándose con CSS hasta que se agreguen las imágenes (ver `lib/perfil.ts`).
- La búsqueda de cuentas en el panel admin es por nombre (el correo vive en Supabase Auth).
