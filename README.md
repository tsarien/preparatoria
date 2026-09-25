# preparatorIA — Fase 0

Esqueleto técnico: Next.js 16 + TypeScript + Tailwind v4 + Supabase, verificado localmente (`next build` pasa sin errores). Ver `PLAN_DESARROLLO.md` en la raíz de tu repo para el resto de fases.

## Lo que ya está hecho aquí

- Proyecto Next.js (App Router) con TypeScript estricto y Tailwind v4.
- Sistema de diseño propio en `app/globals.css` (colores, tipografía) — ver comentario al inicio del archivo.
- 4 componentes base en `components/ui/`: `Button`, `Card`, `Badge` (incluye la variante "sello" para logros), `ProgressBar`.
- Cliente de Supabase (`lib/supabase.ts`) y tipos de las tablas núcleo (`types/database.ts`).
- Migración SQL con las 4 tablas del modelo de datos + Row Level Security (`supabase/migrations/0001_core_schema.sql`).
- `app/page.tsx`: la página "hola mundo" — consulta la tabla `colegios` en el servidor y muestra los componentes base.

## Lo que te falta hacer (fuera de mi alcance: requiere tus propias cuentas)

### 1. Crear el repositorio
```bash
git init
git add .
git commit -m "Fase 0: cimientos técnicos"
```
Crea un repo vacío en GitHub y súbelo (`git remote add origin ... && git push -u origin main`).

### 2. Crear el proyecto en Supabase
1. Ve a [supabase.com](https://supabase.com) → New project.
2. Cuando esté listo, entra a **SQL Editor** → New query, pega el contenido completo de `supabase/migrations/0001_core_schema.sql` → **Run**.
3. Ve a **Project Settings → API** y copia el **Project URL** y la **anon public key**.

### 3. Configurar las variables de entorno
```bash
cp .env.example .env.local
```
Pega ahí el Project URL y la anon key del paso anterior.

### 4. Correr en local
```bash
npm install
npm run dev
```
Abre `http://localhost:3000` — deberías ver la tarjeta de conexión en verde con "Colegio de prueba" (el dato que sembró la migración).

### 5. Desplegar en Vercel
1. Ve a [vercel.com](https://vercel.com) → New Project → importa tu repo de GitHub.
2. En **Environment Variables**, agrega `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (los mismos valores de tu `.env.local`).
3. Deploy.

Cuando la URL pública de Vercel muestre la tarjeta verde de conexión, la Fase 0 está oficialmente completa — marca la casilla en `PLAN_DESARROLLO.md`.

## Fase 1 — Autenticación, perfiles y navegación

Se agregó: registro (`/registro`), login (`/login`), un dashboard protegido (`/dashboard`), y un `proxy.ts` (así se llama el middleware desde Next.js 16) que mantiene viva la sesión. El perfil y el personaje de cada estudiante se crean **solos** al registrarse, vía un trigger de base de datos — no hay lógica de negocio de por medio, así que no hay forma de que un usuario quede a medias.

### Pasos adicionales para esta fase

1. Corre la nueva migración en el SQL Editor de Supabase: `supabase/migrations/0002_auth_perfil_trigger.sql` (después de la 0001).
2. En Supabase, ve a **Authentication → URL Configuration** y agrega:
   - Site URL: `http://localhost:3000` en desarrollo (y la URL de Vercel cuando despliegues).
   - En **Authentication → Providers → Email**, decide si quieres que pida confirmación por correo. Si la desactivas mientras pruebas en local, el registro entra directo al dashboard sin tener que revisar el correo.
3. `npm run dev`, ve a `http://localhost:3000/registro` y crea una cuenta de prueba. Si pones una fecha de nacimiento que te dé menos de 18 años, debería aparecer el campo de correo del acudiente.
4. Verifica en Supabase → Table Editor que se haya creado la fila en `perfiles` y en `personajes` automáticamente.

### Qué no se hizo a propósito (queda para fases siguientes)

- El correo real de confirmación al acudiente (Fase 8).
- Contenido de los módulos (Fases 3-6) — por ahora las tarjetas del dashboard son solo una vitrina.
- El motor de billetera (depositar/retirar) — eso es la Fase 2.

## Fase 2 — Motor de billetera virtual y gamificación

El corazón de esta fase son dos funciones de Postgres — `registrar_transaccion` y `otorgar_xp` — que actualizan el saldo y el nivel de forma atómica (con `select ... for update`, para que dos transacciones al tiempo no se pisen). El código de la app nunca hace `saldo = saldo - monto` por su cuenta; siempre llama a estas funciones vía `supabase.rpc(...)`.

### Pasos adicionales para esta fase

1. Corre `supabase/migrations/0003_wallet_functions.sql` en el SQL Editor de Supabase (después de 0001 y 0002).
2. Corre las pruebas unitarias: `npm test` — deberían pasar 23 pruebas (la fórmula de niveles y la validación de montos/saldo).
3. `npm run dev`, entra a tu dashboard y haz clic en **"Ver estado financiero completo"**. Ahí puedes:
   - Simular un ingreso o un gasto (se guarda de verdad en `transacciones` y actualiza el saldo).
   - Intentar un gasto mayor a tu saldo — debería rechazarlo (`saldo insuficiente`).
   - Otorgarte 50 XP de prueba y ver la barra de nivel moverse; a los 500 XP acumulados subes de nivel.

### Qué no se hizo a propósito (queda para fases siguientes)

- Eventos aleatorios automáticos (facturas, imprevistos) — eso es la Fase 7.
- Contenido real de los módulos — la pantalla de "Simular una transacción" es una herramienta de prueba, no un reto. Los retos de las Fases 3-6 van a llamar a `registrarTransaccion()`/`otorgarXp()` de `lib/wallet.ts` y `lib/gamification.ts` por debajo, en vez de reinventar esta lógica.

## Fase 3 — Módulo: Presupuesto personal

Primer módulo de contenido completo, y primera integración real de IA. Establece el patrón que se repite en las Fases 4-6: cada reto vive en su propia carpeta (`page.tsx` + `*-form.tsx` + `actions.ts`), su contenido sale de la tabla `retos` (columna `config`, jsonb) en vez de estar hardcodeado en el componente, y la retroalimentación la da `getTutorFeedback()` en `lib/ai/prompts/tutor.ts`.

**Cómo funciona el tutor de IA**: usa el soporte nativo de JSON Schema de la API de Gemini (`responseMimeType: "application/json"` + `responseJsonSchema` — no es "le pido que responda en JSON y cruzo los dedos"). El schema vive en `lib/ai/schemas/tutor.ts`, y el tipo de TypeScript se infiere automáticamente de ahí, así que el schema y el tipo nunca se desincronizan. El modelo usado es Gemini Flash-Lite (económico, gratis en Google AI Studio) — ver el comentario en `lib/ai/client.ts` sobre cuándo usar un modelo más capaz.

Los 3 retos del módulo:
1. **Distribuye tu primer salario** — reparte el salario simulado entre categorías; la suma tiene que calzar exacto.
2. **Detecta los gastos hormiga** — identifica cuáles de una lista de gastos son "hormiga".
3. **Prioriza tus gastos** — elige qué comprar con un presupuesto que no alcanza para todo.

Los tres conectan de verdad con la billetera de la Fase 2 (generan transacciones reales) y guardan el resultado en `progreso_usuario_reto`, así que si vuelves a entrar a un reto ya hecho, ves tu resultado en vez del formulario otra vez.

### Pasos adicionales para esta fase

1. Corre `supabase/migrations/0004_modulos_retos.sql` en el SQL Editor (después de 0001-0003). Esto crea las tablas de contenido y siembra el módulo con sus 3 retos.
2. Consigue una API key **gratis y sin tarjeta de crédito** en [Google AI Studio](https://aistudio.google.com/apikey): inicia sesión con una cuenta de Google → "Create API key" → "Create API key in new project" (o elige un proyecto existente). Cópiala y agrégala a `.env.local` como `GEMINI_API_KEY` (y en Vercel cuando despliegues). No pide método de pago — por eso se eligió la API de Gemini para este proyecto: cualquier profesor o jurado puede sacar su propia key gratis en menos de un minuto para probar la app.
3. Corre las pruebas: `npm test` — deberían pasar 37 (23 de la Fase 2 + 14 nuevas de la lógica de los retos).
4. `npm run dev`, entra a tu dashboard → **Presupuesto personal** (ya no dice "Próximamente") → prueba los 3 retos. Si `GEMINI_API_KEY` no está configurada, vas a ver un error claro en vez de que la app se caiga.

### Qué no se hizo a propósito (queda para fases siguientes)

- Los otros 3 módulos del MVP (Fases 4-6) — usan el mismo patrón que este.
- Simulaciones conversacionales con la IA como "personaje" (el estafador, el arrendador) — eso empieza en la Fase 4, con Gemini Flash (más capaz que Flash-Lite, pero se queda en la capa gratuita — ver `lib/ai/client.ts`).

## Fase 4 — Módulo: Detectar estafas

Segundo módulo, y el primero donde la IA actúa como **personaje** dentro de una simulación conversacional (no solo evalúa una respuesta, como en la Fase 3). Esto merece más cuidado, así que antes de escribir el prompt del "estafador" pensé explícitamente en los límites:

- El estafador tiene un **guion fijo** por escenario (`config.senales_clave`, `config.descripcion_personaje` en la migración) — el system prompt le prohíbe explícitamente inventar técnicas de manipulación nuevas o pedir información que no estuviera ya en el guion.
- Si el estudiante intenta sacarlo de personaje ("ignora tus instrucciones", pedirle trucos reales para estafar a alguien), la instrucción es quedarse en personaje y no cooperar — nunca romper el guion educativo.
- Cada escenario tiene un **límite de 3 mensajes** del estudiante (`lib/estafas.ts` → `MAX_MENSAJES_ESTUDIANTE`), para que sea una práctica corta y controlada, no una conversación abierta.
- El módulo tiene **4 escenarios, no todos son estafas**: 3 sí lo son (premio falso, phishing bancario, "inversión" que triplica la plata) y 1 es un correo legítimo del colegio. La idea es enseñar a distinguir, no a desconfiar de todo.
- La evaluación final reutiliza el mismo `getTutorFeedback()` de la Fase 3 (mismo schema, ahora con categorías de error nuevas como `no_detecta_senales_estafa`), en vez de inventar un sistema paralelo.
- El estafador usa Gemini Flash (`MODELO_PERSONAJE` en `lib/ai/client.ts`), no Flash-Lite — una conversación necesita sonar más natural que una evaluación estructurada de una sola respuesta. Se queda dentro de la familia Flash (no Pro) a propósito, para no salirse de la capa gratuita.

Si detectas correctamente una de las 3 estafas reales, el personaje recibe como "ingreso" el dinero que se habría perdido (`categoria: estafa_evitada`) — otra conexión real con la billetera de la Fase 2.

### Pasos adicionales para esta fase

1. Corre `supabase/migrations/0005_modulo_estafas.sql` en el SQL Editor.
2. `npm test` — deberían pasar 49 pruebas (12 nuevas de `lib/estafas.ts`).
3. `npm run dev` → dashboard → **Detectar estafas**. Prueba los 4 escenarios, incluyendo el legítimo (para confirmar que el módulo no te enseña a desconfiar de todo).

### Qué no se hizo a propósito (queda para fases siguientes)

- Los otros 2 módulos del MVP (Fases 5-6).
- El segundo módulo de seguridad digital (cuidado de datos personales) — es roadmap, no MVP.

## Fase 5 — Módulo: Contrato de arriendo

Tercer módulo, y segundo personaje de IA (`simularArrendador()` en `lib/ai/prompts/arrendador.ts`, mismos límites de guion fijo que el estafador de la Fase 4). Dos retos:

1. **Lee el contrato** — un contrato de arriendo ficticio pero realista, con 8 cláusulas (3 de ellas problemáticas: incremento anual por encima del IPC, reparaciones estructurales a cargo del arrendatario, interés de mora del 5% diario) + 3 preguntas de comprensión. El estudiante marca las cláusulas que le parecen preocupantes.
2. **Negocia con el arrendador** — chat de negociación (máximo 4 mensajes) para intentar bajar el depósito de 2 meses a 1. El arrendador (Gemini Flash) es cordial pero no cede solo porque se lo pidan — solo si el estudiante da una razón real.

**Corrección importante**: los retos de las Fases 3 y 4 nunca estaban llamando a `otorgarXp()` — la barra de nivel del dashboard existía pero no se estaba alimentando de completar retos, solo del botón de prueba de la Fase 2. Ya está corregido en los 4 retos anteriores además de los 2 nuevos: completar cualquier reto ahora otorga XP (el puntaje del tutor, con un mínimo de 10 para que intentarlo siempre cuente para algo).

### Pasos adicionales para esta fase

1. Corre `supabase/migrations/0006_modulo_contrato.sql`.
2. `npm test` — deberían pasar 57 pruebas (8 nuevas de `lib/contrato.ts`).
3. `npm run dev` → dashboard → **Contrato de arriendo**. Después de completar cualquier reto (de este módulo o de los anteriores), deberías ver la barra de XP del dashboard moverse de verdad.

### Qué no se hizo a propósito (queda para fases siguientes)

- El último módulo del MVP: Ahorro con metas (Fase 6).
- El módulo completo de crédito hipotecario — el MVP solo llega hasta ahorro para cuota inicial (Fase 6); crédito hipotecario completo es roadmap.

## Fase 6 — Módulo: Ahorro con metas

**Con esta fase, el MVP de 4 módulos queda completo.**

Este módulo es distinto a los tres anteriores: no es una decisión de una sola vez, sino una meta que el personaje sigue alimentando con el tiempo. Por eso tiene su propia tabla (`metas_ahorro`) en vez de vivir solo en `progreso_usuario_reto`.

- El estudiante define su meta (por defecto, "cuota inicial de un apartamento") con un monto objetivo y un aporte mensual planeado. El tutor de IA evalúa si el plan es realista dado su salario simulado — esto pasa **una sola vez**, al crear la meta.
- Después, puede volver cuando quiera y hacer aportes reales desde su saldo — cada aporte llama a `aportar_a_meta()` en Postgres, que **reutiliza `registrar_transaccion()` de la Fase 2** en vez de duplicar la lógica de mover plata (valida saldo suficiente, actualiza el saldo, todo en la misma transacción atómica).
- La proyección de "cuántos meses te faltan" es una función pura (`calcularMesesParaMeta` en `lib/ahorro.ts`), probada con Vitest — incluye el caso borde de un aporte mensual de $0 (nunca se alcanza la meta).

### Pasos adicionales para esta fase

1. Corre `supabase/migrations/0007_modulo_ahorro.sql`.
2. `npm test` — deberían pasar 73 pruebas (16 nuevas de `lib/ahorro.ts`).
3. `npm run dev` → dashboard → **Ahorro con metas** → crea tu meta → haz un par de aportes y mira la barra de progreso moverse, y tu saldo bajar en la pantalla de billetera (`/dashboard/billetera`).

### Qué sigue (roadmap, fuera de este documento por ahora)

Con el MVP de 4 módulos completo, lo que queda del plan original son las Fases 7 (eventos aleatorios diarios + notificaciones + ranking) y 8 (pulido, pruebas E2E, cumplimiento de Ley 1581 con el flujo real de consentimiento del acudiente) — ver `PLAN_DESARROLLO.md` para el detalle de cada una.

## Fase 7 — Retención: eventos aleatorios y notificaciones

Esta fase tenía tres piezas grandes — el propio plan sugería poder dividirla. Antes de escribir código tomé una decisión de arquitectura que vale la pena que conozcas:

**Sobre las notificaciones**: el plan original mencionaba Web Push (service worker) o correo. Web Push real necesita VAPID keys, gestión de suscripciones, y solo se puede probar de verdad con el sitio ya desplegado en HTTPS — nada de eso lo puedo verificar desde aquí. Así que construí un **indicador dentro de la app** (un aviso en el dashboard con el número de eventos pendientes, enlazando a atenderlos) como el mecanismo principal — funciona siempre, sin pedir permisos del navegador, y lo pude probar de punta a punta. Si más adelante quieres Web Push real o correo con Resend, quedó como extensión documentada: preferí no construirla a medias y entregarte algo que no pude confirmar que funciona.

**Lo que sí se construyó y se verificó:**

- **`generar_eventos_diarios()`**: función de Postgres que le genera 0-2 eventos aleatorios por día a cada personaje (factura inesperada, imprevisto médico, bono, o una "oferta sospechosa" — esta última conecta con lo que aprendiste en el módulo de detectar estafas). Se programa con `pg_cron`; también la puedes llamar a mano para probar sin esperar un día.
- **`resolver_evento()`**: atender un evento reutiliza `registrar_transaccion()` (Fase 2) y otorga 5 XP reutilizando `otorgar_xp()` (Fase 2) — todo en una sola función atómica. Ignorar una oferta sospechosa (la jugada correcta) no cuesta nada.
- **Ranking por colegio**: una función `security definer` que expone *solo* nombre, curso, nivel y XP — nunca datos sensibles. A propósito NO es una policy de RLS ampliada: eso habría dejado ver el perfil completo de tus compañeros (correo del acudiente incluido) por la API de Supabase. La función controla exactamente qué columnas salen.

### Pasos adicionales para esta fase

1. Corre `supabase/migrations/0008_eventos_ranking.sql`.
2. **Antes** de correr el archivo completo, activa la extensión `pg_cron`: Dashboard de Supabase → Database → Extensions → busca "pg_cron" → Enable. Si ya corriste el archivo sin activarla, todo quedó creado igual excepto el `cron.schedule(...)` del final — actívala y vuelve a correr solo ese último bloque.
3. `npm test` — deberían pasar 79 pruebas (6 nuevas de `lib/eventos.ts`).
4. Para probar sin esperar un día: en el SQL Editor, corre `select public.generar_eventos_diarios();` y luego entra a tu dashboard — deberías ver el aviso de eventos pendientes.
5. Registra un segundo usuario con el mismo colegio para ver el ranking con más de una fila.

### Qué no se hizo a propósito

- Web Push / correo real — documentado arriba, es una extensión futura razonable, no una promesa incumplida.
- Filtrar "personaje activo" por actividad reciente — de momento todos los personajes reciben eventos; cuando exista un campo de último login, se puede acotar.

## Fase 8 — Pulido, pruebas y cumplimiento

Última fase del plan original. Cinco piezas:

### 1. Corrección de RLS (lo encontré haciendo la revisión que pide esta fase)

`colegios` tenía política de lectura pública pero **no de inserción**. Con RLS activado, cualquier operación sin política queda denegada por defecto — así que crear un colegio nuevo durante el registro (cuando escribes uno que no existe todavía) habría fallado contra una base de datos real, aunque `next build` nunca lo iba a detectar porque el build no habla con Postgres. Ya está corregido en `0009_consentimiento_y_rls.sql`. Para verificar que RLS está activo en todas las tablas, corre esto en el SQL Editor:

```sql
select tablename, rowsecurity from pg_tables where schemaname = 'public' order by tablename;
```

Debería devolver `true` en cada fila.

### 2. Flujo real de consentimiento del acudiente

Cuando un menor de edad se registra, se crea una `solicitud_consentimiento` con un token único, y se le envía un correo al acudiente (vía Resend) con un enlace a `/consentimiento/[token]` — una página pública, sin necesidad de sesión, donde puede autorizar o rechazar. La función que resuelve la solicitud (`resolver_consentimiento`) es la única de todo el proyecto con permiso para el rol `anon`, a propósito: el acudiente no tiene cuenta, el token ES su credencial.

Si no configuras `RESEND_API_KEY`, el registro no se rompe — te muestra el enlace directamente en pantalla para que puedas probar el flujo igual.

### 3. Página de privacidad

`/privacidad` — qué datos se recolectan, para qué, los derechos del titular (acceso, corrección, eliminación), y cómo funciona el consentimiento. Es un borrador razonable para el proyecto académico, con una nota clara de que necesita revisión legal real antes de usarse con estudiantes de verdad.

### 4. Accesibilidad

Revisión manual (no pude correr un auditor automático tipo Lighthouse sin un despliegue en vivo): las tarjetas de retroalimentación y los mensajes de chat ahora tienen `aria-live="polite"` para que un lector de pantalla los anuncie sin que la página recargue; los errores ya tenían `role="alert"` desde antes; el foco de teclado es visible en todos los campos (`:focus-visible` en `app/globals.css`); las paletas de color se eligieron con contraste suficiente desde el principio (tonos oscuros sobre fondo claro, nunca texto de bajo contraste). Antes de la sustentación, vale la pena correr Lighthouse o la extensión axe DevTools sobre el sitio ya desplegado — eso sí lo puedo revisar contigo si me compartes los resultados.

### 5. Pruebas E2E (Playwright) — con una limitación honesta

Instalé Playwright y escribí 17 pruebas en dos archivos:

- **`e2e/navegacion-publica.spec.ts`** (13 pruebas): páginas públicas y protección de rutas. No necesitan credenciales reales.
- **`e2e/flujos-modulos.spec.ts`** (4 pruebas): el flujo completo de cada módulo — registro, login, completar el reto, ver retroalimentación real de la IA. Se saltan solas (`test.skip`) si no detectan `NEXT_PUBLIC_SUPABASE_URL` y `GEMINI_API_KEY` en `.env.local`, en vez de fallar de forma confusa.

**Lo que no pude hacer**: este entorno no tiene acceso de red para descargar los navegadores que Playwright necesita para ejecutarse (`cdn.playwright.dev` no está en la lista de dominios permitidos aquí). Verifiqué todo lo que sí pude sin eso:

- Las 17 pruebas compilan sin errores de TypeScript (`npx tsc --noEmit`).
- Playwright las reconoce y las lista correctamente (`npx playwright test --list`).
- Al intentar correrlas, el único error es *"Executable doesn't exist"* — confirma que el bloqueo es la descarga del navegador, no un problema de las pruebas ni de la app.

**Otro ajuste que hizo falta**: por defecto, Vitest recoge cualquier archivo `*.spec.ts`, así que al agregar Playwright empezó a intentar correr sus pruebas como si fueran de Vitest (y fallaban, porque usan la API de Playwright, no la de Vitest). Se agregó `vitest.config.ts` para excluir `e2e/` explícitamente — con esto, `npm test` vuelve a correr limpio (79 pruebas) y `npm run test:e2e` corre las de Playwright por separado.

En tu computador, esto sí va a funcionar de punta a punta:

```bash
npx playwright install
npm run dev          # en otra terminal, o deja que Playwright la levante solo
npm run test:e2e
```

### Con esto, el plan de las 9 fases (0 a 8) queda completo

Repo, base de datos con RLS en todas las tablas, autenticación con consentimiento real de acudientes, motor de billetera + gamificación, los 4 módulos del MVP, 2 personajes de IA, eventos aleatorios diarios, ranking, política de privacidad, y 96 pruebas (79 unitarias + 17 E2E escritas). Ver `MANUAL_USUARIO.md` para una guía corta pensada para la sustentación, no para desarrolladores.

Lo que queda fuera de este plan (documentado como roadmap desde el principio, nunca fue parte del MVP): hoja de vida, entrevista de trabajo, emprendimiento, crédito hipotecario completo, cuidado de datos personales, panel B2B para colegios, reportes B2C para padres, monetización, y app móvil nativa.

## Extensión: modo claro / oscuro

No estaba en el plan original, se agregó a pedido. Nueva página **Ajustes** (`/dashboard/ajustes`, enlazada desde el dashboard) con selector Claro / Oscuro / Sistema.

Cómo funciona: todo el sistema de diseño desde la Fase 0 usa variables CSS (`--color-paper`, `--color-ink`, etc.) en vez de colores fijos — los componentes usan clases como `bg-paper` o `text-ink`, nunca un hex directo. Eso significa que el modo oscuro se resuelve *solo* redefiniendo esas variables dentro de una clase `.dark` en `app/globals.css`; no hubo que tocar ninguno de los ~40 archivos de componentes/páginas que ya existían.

- La preferencia se guarda en `localStorage` (no en la base de datos — es una preferencia del dispositivo, no del usuario).
- Un script inline en `app/layout.tsx` aplica el tema *antes* de que React hidrate, para evitar el parpadeo típico de "carga en claro y salta a oscuro". `suppressHydrationWarning` en `<html>` es intencional: sin eso, React se queja de que el servidor no sabía qué clase iba a poner ese script.
- Si eliges "Sistema", `components/theme-system-listener.tsx` sigue escuchando cambios en el sistema operativo mientras usas la app (no solo al cargar la página).
- La lógica de qué opción implica modo oscuro (`resolverEsOscuro` en `lib/theme.ts`) es una función pura, con 5 pruebas unitarias (84 en total en el proyecto ahora).

## Extensión: revisión de responsive (mobile + web)

Revisión real del código, no una suposición — busqué específicamente grillas de columnas fijas y contenedores flex que pudieran desbordarse en pantallas angostas:

- **3 grillas de columnas fijas** (`grid-cols-2` / `grid-cols-3` sin variante responsive) que quedaban apretadas en un iPhone SE (320px): el selector de tema en Ajustes, las tarjetas de "Ahorrado/Meta" del tracker de ahorro, y los campos tipo/monto de la pantalla de prueba de billetera. Las tres ahora apilan en una columna en pantallas angostas y se abren en varias columnas desde el breakpoint `sm:` (640px).
- **Texto libre que podía desbordar una fila flex** (nombre del estudiante en el ranking, descripción de una transacción): se agregó `min-w-0` al contenedor y `break-words`, para que un nombre largo se ajuste a varias líneas en vez de forzar scroll horizontal — un problema clásico de Flexbox (los hijos no se encogen por debajo de su contenido a menos que se les diga explícitamente).
- Botones que podían quedar muy juntos en 320px (los de la portada, los de "¿es estafa?") ahora tienen `flex-wrap`.
- El viewport meta tag (`width=device-width, initial-scale=1`) ya lo pone Next.js automáticamente — confirmado en el HTML generado.

**Nueva prueba E2E** (`e2e/responsive.spec.ts`): en viewport de 320px, confirma que las páginas públicas nunca generan scroll horizontal — la señal más simple y confiable de que algo se desbordó. Además, `playwright.config.ts` ahora corre las pruebas en un proyecto "chromium" (desktop) y uno "mobile" (Pixel 7), así que `npm run test:e2e` cubre ambos tamaños. Mismo aviso que en la Fase 8: no pude ejecutarlas aquí (sin acceso para descargar el navegador), pero sí verifiqué que compilan y que Playwright las reconoce y lista correctamente (44 pruebas entre los dos proyectos + las de responsive).

## Extensión: identidad de marca real

Se reemplazó el sistema de diseño provisional (Fase 0) por la identidad de marca definitiva.

**Paleta** (`app/globals.css`) — mismos nombres de token de siempre (`bg-primary` es nuevo; `paper`/`ink`/`gold`/`growth`/`alert`/`line` se mantienen, solo cambiaron de valor), así que se re-temátizó toda la app sin tocar componentes, igual que con el modo oscuro:

| Token | Valor | Rol |
|---|---|---|
| `--color-primary` | `#6C4DFF` (morado/índigo) | Color de marca — botones, enlaces, barra de progreso |
| `--color-gold` | `#FFB020` (naranja) | Acento — logros, XP, momentos especiales (mismo rol que antes, color nuevo) |
| `--color-ink` | `#1F2430` | Texto |
| `--color-paper` | `#FFFFFF` | Fondo |
| `--color-line` | `#E9EAF2` | Bordes |

Se agregó `--color-primary-soft` y un tono `primary` nuevo en `Badge`. Los valores de modo oscuro se rehicieron a partir de esta paleta (no son los mismos de antes).

**Tipografía**: Baloo 2 (encabezados — redondeada, combina con el estilo pixel-art de la mascota) + Inter (cuerpo de texto), reemplazando Space Grotesk + IBM Plex Sans. IBM Plex Mono se mantiene para cifras.

**Logo real** (`public/logo-*.png`) — recortado y con fondo transparente a partir de los archivos que compartiste (antes tenían fondo blanco sólido, lo que se hubiera visto como una caja blanca en modo oscuro). Reemplaza el wordmark de texto en: portada, layout de login/registro, consentimiento, privacidad, y el ícono chico en el header del dashboard. También es el favicon (`app/icon.png`).

**Mascota "Tutor IA"** (`public/mascota/*.png`) — recorté las 3 expresiones de la hoja que compartiste. La usa `FeedbackCard` (el componente que se ve después de cada reto): celebra si el puntaje es ≥70, se pone pensativa si no — es la cara del `getTutorFeedback()` que ya existía desde la Fase 3, ahora con personaje. También aparece en la portada.

**Íconos de módulo** (`public/iconos/*.png`) — recortados del moodboard. Coinciden exactos con 3 de los 4 módulos del MVP:

| Ícono | Módulo |
|---|---|
| Seguridad (escudo) | Detectar estafas |
| Contrato (documento) | Contrato de arriendo |
| Ahorro (alcancía) | Ahorro con metas |
| Empleo (maletín) | *(sin usar todavía — no hay módulo de empleo en el MVP)* |

**Lo que faltaba, si quieres el set completo**: no había un ícono para "Presupuesto personal" en lo que compartiste. Antes que ponerle la alcancía de "Ahorro con metas" (quedarían dos tarjetas con el mismo ícono) o inventar uno que no combine con el estilo pixel-art del resto, lo dejé sin ícono por ahora. Si me pasas uno (o me dices que use el maletín de "Empleo" ahí, aunque no calce del todo semánticamente), lo agrego.

### Ronda 2 de íconos (generados con ChatGPT a partir de los prompts que te di)

Cerraron los gaps pendientes:

- **Presupuesto personal** (billetera + gráfico circular) — ya tiene ícono en su tarjeta del dashboard.
- **Saldo** (moneda) — junto al saldo en el dashboard y en la pantalla de billetera.
- **Ranking** (trofeo) — en el botón del dashboard y en el título de `/dashboard/ranking`.
- **4 íconos de eventos** (`public/iconos/eventos/`) — factura, imprevisto médico, bono, y alerta (para "oferta sospechosa") — cada tarjeta de `/dashboard/eventos` ahora muestra el ícono que corresponde a `evento.tipo`.

Mismo proceso técnico que la primera ronda: recorte por densidad de contenido (para separar cada ícono de su etiqueta de texto) + conversión de fondo blanco a transparente, para que no se vean como una caja blanca en modo oscuro.

## Extensión: paisaje dinámico + rediseño de portada, login y registro

**El paisaje cambia con la hora real de Colombia — 5 franjas, no atadas al modo claro/oscuro.**

- `lib/paisaje.ts`: calcula la hora en `America/Bogota` (Colombia no tiene horario de verano, así que esto no necesita ajuste estacional) y la clasifica en 5 franjas con límites de media hora, no horas redondas, para que el amanecer y el atardecer no se sientan instantáneos:

  | Franja | Horario |
  |---|---|
  | Amanecer | 4:30 – 6:59 |
  | Mañana | 7:00 – 10:59 |
  | Mediodía | 11:00 – 15:59 |
  | Atardecer | 16:00 – 18:59 |
  | Noche | 19:00 – 4:29 |

  11 pruebas unitarias sobre los límites exactos (incluyendo el envolvimiento de la noche alrededor de la medianoche).

- `components/paisaje-fondo.tsx`: elige la imagen (`public/paisaje/*.jpg`) según la hora — **nunca** según el tema. El modo claro/oscuro solo tiñe un velo semitransparente encima (`bg-paper/55`, el mismo token de siempre) para que la tarjeta de arriba tenga contraste sin importar qué tan clara sea la imagen de fondo (mediodía) o qué tan oscura (noche). Por diseño, el paisaje y el modo de lectura son independientes — puedes tener modo claro en la interfaz de noche en Colombia, y se ve bien igual.
- **Aviso de calidad honesto**: las imágenes de amanecer/mañana/mediodía/atardecer salieron de un grid de 5 paneles (~390px de ancho cada uno) — se ven bien a los tamaños que se usan aquí, pero si alguna vez las ves algo suaves al agrandar la ventana mucho, es por eso. La de noche es una versión ancha dedicada (1983px), notablemente más nítida. Si quieres parejo el set completo, un siguiente paso sería pedir 4 versiones anchas equivalentes.
- **Botón de tema nuevo** (`components/theme-toggle-button.tsx`): sol/luna (íconos de `lucide-react`), arriba a la derecha, flotando sobre el paisaje con fondo translúcido. Alterna directo entre claro/oscuro (no pasa por "sistema") — la selección de 3 opciones completa sigue viviendo en Ajustes. Ambos leen y escriben la misma preferencia, así que se mantienen sincronizados.
- **Portada, login y registro** rediseñados sobre el paisaje: tarjetas con fondo translúcido (`bg-paper-raised/92 backdrop-blur-xl`) para que se sientan integradas a la escena en vez de flotar encima sin relación. Los campos del formulario de registro y login ahora tienen ícono (nombre, fecha, colegio, curso, correo, contraseña) — se agregó `lucide-react` para esto, y un componente compartido `components/ui/campo-con-icono.tsx` para no duplicar el mismo campo con ícono en los dos formularios.
- La portada no copió la barra de navegación completa de tus prototipos (Inicio/Retos/Características/Beneficios/Contacto) — esas son secciones que no existen todavía en la app real, y agregar enlaces rotos se sentiría peor que no tenerlos. Se quedó con logo + botón de tema, que es lo que sí corresponde a algo real.

**Nota sobre este bloque de trabajo**: a mitad de esta extensión, el entorno donde vengo armando el proyecto se reinició (un problema de infraestructura) y perdí el árbol de archivos en el que estaba trabajando. Lo reconstruí completo desde el último zip entregado + tus imágenes originales (que sí seguían disponibles) + el código exacto que ya había escrito en la conversación — no se perdió ningún avance, pero lo menciono porque es la razón de que este bloque se haya reconstruido "de una sola vez" en vez de en varios pasos.


## Notas técnicas

- Las fuentes (Space Grotesk, IBM Plex Sans, IBM Plex Mono) se cargan por `<link>` en `app/layout.tsx`, no con `next/font/google`, para no depender de acceso a Google Fonts durante el build en cualquier entorno restringido. Si más adelante quieres el rendimiento extra de fuentes autoalojadas, es un cambio pequeño.
- `types/database.ts` está escrito a mano. En cuanto tengas el proyecto de Supabase real, regenera los tipos oficiales con: `npx supabase gen types typescript --project-id TU_PROJECT_ID > types/database.ts` (y ahí sí puedes volver a pasar `<Database>` al cliente en `lib/supabase.ts`).

## Migración de la API de Claude a la API de Gemini

La capa de IA (`lib/ai/`) originalmente usaba la API de Claude (Anthropic). Se migró a la API de Gemini (`@google/genai`, Google AI Studio) para que un profesor o jurado pueda conseguir su propia API key gratis y sin tarjeta de crédito en `aistudio.google.com/apikey`, en vez de tener que comprar créditos. `MODELO_TUTOR` y `MODELO_PERSONAJE` (en `lib/ai/client.ts`) se quedan en la familia **Flash** a propósito — los modelos Pro de Gemini salieron de la capa gratuita en abril de 2026.

**Incidente del 24 de septiembre de 2026**: en la primera prueba en vivo, el módulo de Detectar Estafas devolvió el JSON crudo de un error 503 de Gemini (`"This model is currently experiencing high demand"`) directo en la pantalla del estudiante. Causa: Google AI Studio reporta que sus modelos "gratis" pueden saturarse momentáneamente bajo demanda alta, algo transitorio y del lado de Google, no un problema de configuración. Se corrigió en `lib/ai/client.ts` con dos cambios que aplican a las 3 funciones de IA (`getTutorFeedback`, `simularArrendador`, `simularEstafador`):
1. `llamarConReintento()` — reintenta automáticamente (hasta 2 veces, con backoff corto) solo los errores transitorios (HTTP 503 y 429). Cualquier otro error (API key inválida, etc.) no se reintenta.
2. `mensajeErrorIA()` — nunca deja pasar el texto crudo del error del SDK al estudiante; siempre devuelve un mensaje en español entendible, y registra el detalle técnico con `console.error` (visible en los logs del servidor/Vercel, no en el navegador).

Si vuelves a ver un error de IA en producción, revisa primero los logs de Vercel (ahí sí aparece el detalle real gracias al `console.error`) antes de asumir que es un bug de configuración.
