# preparatorIA — Arquitectura y plan de desarrollo con IA

**Proyecto de grado · Tecnólogo en Análisis y Desarrollo de Software (SENA)**

> Documento vivo. Guárdalo en la raíz del repositorio como `PLAN_DESARROLLO.md`. Actualiza la casilla de cada fase al terminarla, y usa este archivo como contexto base en cada sesión nueva con una IA (chat normal o Claude Code).

## Estado del proyecto

- [ ] Fase 0 — Cimientos técnicos y modelo de datos
- [ ] Fase 1 — Autenticación, perfiles y navegación
- [ ] Fase 2 — Motor de billetera virtual y gamificación
- [ ] Fase 3 — Módulo: Presupuesto personal
- [ ] Fase 4 — Módulo: Detectar estafas
- [ ] Fase 5 — Módulo: Contrato de arriendo
- [ ] Fase 6 — Módulo: Ahorro con metas
- [ ] Fase 7 — Retención: eventos aleatorios y notificaciones
- [ ] Fase 8 — Pulido, pruebas y cumplimiento

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Stack tecnológico](#2-stack-tecnológico)
3. [Arquitectura general y estructura de carpetas](#3-arquitectura-general-y-estructura-de-carpetas)
4. [Modelo de datos](#4-modelo-de-datos)
5. [Capa de IA: tutor adaptativo y personajes](#5-capa-de-ia-tutor-adaptativo-y-personajes)
6. [Alcance: MVP vs. roadmap](#6-alcance-mvp-vs-roadmap)
7. [Seguridad, privacidad y cumplimiento (Ley 1581)](#7-seguridad-privacidad-y-cumplimiento-ley-1581)
8. [Plan de desarrollo por fases](#8-plan-de-desarrollo-por-fases)
9. [Cómo trabajar con IA fase por fase](#9-cómo-trabajar-con-ia-fase-por-fase)
10. [Próximos pasos inmediatos](#10-próximos-pasos-inmediatos)

---

## 1. Resumen ejecutivo

Este documento define (a) la arquitectura técnica de preparatorIA y (b) un plan de desarrollo dividido en 9 fases (Fase 0 a Fase 8), diseñado específicamente para que cada fase se pueda ejecutar con ayuda de una IA en una sesión con contexto acotado, sin necesidad de que la IA "recuerde" todo el proyecto a la vez.

Decisiones clave:

- **Producto**: aplicación web progresiva (PWA) mobile-first, no apps nativas separadas. Evita procesos de aprobación en tiendas de apps, funciona en cualquier dispositivo con navegador (importante dado que el público son colegiales, algunos con acceso limitado a equipos), y permite notificaciones push.
- **MVP**: 4 módulos jugables completos (presupuesto personal, detectar estafas, contrato de arriendo, ahorro con metas) más el motor de "Mi Vida Simulada" (billetera virtual + gamificación) que los sostiene. Coincide con lo que ya identificaste en el contexto del proyecto.
- **Resto de los 11 módulos + monetización + app nativa + paneles B2B/B2C**: quedan documentados como roadmap (sección 6), no se construyen en el MVP.
- **Supuesto de alcance**: este plan asume un desarrollador trabajando solo, con dedicación parcial (~10-15 h/semana). Si trabajas en equipo, las fases 3 a 6 (los módulos) se pueden repartir en paralelo entre integrantes, ya que son independientes entre sí una vez completada la Fase 2.

---

## 2. Stack tecnológico

| Capa | Tecnología | Por qué |
|---|---|---|
| Frontend | Next.js (App Router) + React + TypeScript | El framework más usado y documentado del ecosistema web actual; une frontend y backend en un solo proyecto, lo que simplifica el despliegue para un desarrollador solo |
| Estilos / UI | Tailwind CSS + shadcn/ui | Permite construir una interfaz gamificada y pulida rápido, sin diseñar componentes desde cero |
| Estado en cliente | Zustand | Alternativa simple a Redux; curva de aprendizaje corta |
| Backend / API | Next.js Route Handlers | Evita mantener un servidor aparte; suficiente para la lógica de negocio del MVP |
| Base de datos | PostgreSQL (vía Supabase) | Relacional — importante para la integridad de las transacciones de la billetera virtual; capa gratuita generosa |
| Autenticación | Supabase Auth | Registro, login y verificación de correo listos para usar; se puede construir el flujo de consentimiento del acudiente encima |
| IA / tutor adaptativo | API de Gemini (Google AI Studio) | Soporta salidas estructuradas nativas (JSON Schema), no solo texto libre — clave para que la retroalimentación de un reto sea procesable por tu código (puntaje, categoría de error, ajuste de dificultad), no solo un párrafo. Se eligió sobre la API de Claude porque su capa gratuita no pide tarjeta de crédito, algo importante para que un profesor/jurado pueda probar la app sin fricción |
| Notificaciones | Web Push (service worker) + correo de respaldo | Coherente con el enfoque PWA, sin depender de tiendas de apps |
| Hosting frontend/API | Vercel (capa gratuita) | Despliegue automático desde GitHub, sin configurar servidores |
| Hosting datos/backend | Supabase Cloud (capa gratuita) | DB + Auth + Storage + Edge Functions (para los eventos diarios) en un solo lugar |
| Control de versiones | Git + GitHub | Estándar de la industria; necesario para trabajar bien con Claude Code y para la sustentación |
| Testing | Vitest + React Testing Library (unitarias) · Playwright (E2E) | Estándar moderno, rápido, bien documentado |

**Principio de selección**: se priorizaron tecnologías (a) gratuitas o con capa gratuita amplia, (b) muy populares y bien documentadas —esto reduce directamente el riesgo de alucinaciones cuando una IA te ayuda a programar, porque ha visto muchísimo código real de estos frameworks— y (c) razonables de aprender para alguien trabajando solo.

---

## 3. Arquitectura general y estructura de carpetas

El diagrama de arriba resume el flujo: **Cliente (PWA) → Servidor/API → Supabase + Gemini API → Notificaciones**. En texto:

1. El estudiante interactúa con la PWA (Next.js) en su navegador o desde el ícono instalado en su celular.
2. Cada acción relevante (responder un reto, tomar una decisión en una simulación) llama a un endpoint del servidor (Next.js Route Handlers).
3. El servidor lee/escribe en Supabase (perfil, billetera, progreso) y, cuando corresponde, llama a la API de Gemini para generar retroalimentación o sostener una simulación conversacional (el arrendador, el entrevistador, el estafador).
4. Una función programada en Supabase (Edge Function + cron) genera eventos aleatorios diarios y dispara notificaciones hacia el estudiante.

### Estructura de carpetas sugerida

```
/app
  /(auth)                 → login, registro
  /dashboard              → panel principal del estudiante
  /modulos/[modulo]       → páginas de cada módulo/reto
  /api                    → route handlers (endpoints internos)
/components                → componentes de UI reutilizables
/lib
  /ai
    client.ts              → configuración del SDK de Gemini (@google/genai)
    /prompts                → un archivo por personaje: tutor.ts, arrendador.ts, entrevistador.ts, evaluador-estafa.ts
    /schemas                → definiciones de las salidas estructuradas de cada personaje
  wallet.ts                 → lógica del motor de billetera virtual (Fase 2)
  supabase.ts               → cliente de Supabase
/types                      → tipos de TypeScript compartidos
/supabase
  /migrations                → cambios de esquema de base de datos
```

Este esqueleto importa por una razón práctica: cuando le pidas a una IA que trabaje en "la Fase 4", si ya existe esta estructura, la IA sabe exactamente dónde debe crear o modificar archivos sin tener que explicárselo cada vez.

---

## 4. Modelo de datos

Entidades principales y relación entre ellas:

- **perfiles** (extiende `auth.users` de Supabase) → 1:1 con **personajes**, N:1 con **colegios**
- **colegios** → agrupa estudiantes para rankings por colegio/curso
- **personajes** ("Mi Vida Simulada": saldo, salario simulado, nivel, XP) → 1:N con **transacciones** y **eventos_aleatorios**
- **modulos** → 1:N con **retos**
- **retos** → conectados a **perfiles** mediante **progreso_usuario_reto** (N:M)
- **logros** → 1:N desde **perfiles**

Campos importantes por entidad:

| Entidad | Campos clave |
|---|---|
| `perfiles` | nombre, fecha_nacimiento, colegio_id, curso, rol, correo_acudiente, consentimiento_acudiente (pendiente/aprobado) |
| `colegios` | nombre, ciudad, codigo_institucional |
| `personajes` | usuario_id, saldo_billetera, salario_mensual, nivel, xp |
| `transacciones` | personaje_id, tipo (ingreso/gasto), categoria, monto, origen, fecha |
| `modulos` | grupo (dinero/vida_independiente/vida_profesional/seguridad_digital), nombre, orden, estado (mvp/roadmap) |
| `retos` | modulo_id, tipo, dificultad, config (jsonb) |
| `progreso_usuario_reto` | usuario_id, reto_id, estado, intentos, puntaje, feedback_ia |
| `eventos_aleatorios` | personaje_id, tipo, impacto_monto, estado, fecha |
| `logros` | usuario_id, tipo, fecha_obtenido |

### Ejemplo orientativo de las tablas núcleo (ajustar en Fase 0)

```sql
-- Perfiles (extiende auth.users de Supabase)
create table public.perfiles (
  id uuid references auth.users(id) primary key,
  nombre text not null,
  fecha_nacimiento date,
  colegio_id uuid references public.colegios(id),
  curso text,
  rol text default 'estudiante',
  correo_acudiente text,
  consentimiento_acudiente text default 'pendiente', -- pendiente | aprobado
  creado_en timestamptz default now()
);

create table public.colegios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  ciudad text,
  codigo_institucional text unique
);

create table public.personajes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.perfiles(id) unique not null,
  saldo_billetera numeric(12,2) default 0,
  salario_mensual numeric(12,2) default 0,
  nivel int default 1,
  xp int default 0,
  creado_en timestamptz default now()
);

create table public.transacciones (
  id uuid primary key default gen_random_uuid(),
  personaje_id uuid references public.personajes(id) not null,
  tipo text not null, -- ingreso | gasto
  categoria text,
  monto numeric(12,2) not null,
  descripcion text,
  origen text, -- ej: 'reto:presupuesto-01' o 'evento:factura'
  creado_en timestamptz default now()
);
```

**Importante**: activa Row Level Security (RLS) en todas las tablas desde la Fase 0. Cada estudiante solo debe poder leer/escribir sus propios datos — esto no es opcional dado que se manejan datos de menores de edad.

Las tablas `modulos`, `retos`, `progreso_usuario_reto`, `eventos_aleatorios` y `logros` siguen un patrón similar; se definen con detalle en la Fase 0/2 cuando ya tengas claro el contenido exacto de los primeros retos.

---

## 5. Capa de IA: tutor adaptativo y personajes

La IA cumple tres roles distintos en la app (según el contexto del proyecto): dar retroalimentación, ajustar dificultad, y actuar como personaje dentro de una simulación. Para que esto sea confiable y no solo "texto bonito", cada interacción de evaluación con la IA debe devolver una **salida estructurada** (usando el soporte nativo de JSON Schema de la API de Gemini — `responseMimeType` + `responseJsonSchema`), no solo un mensaje de chat libre. Las simulaciones conversacionales (el arrendador, el estafador) sí son texto libre a propósito — ahí lo que se estructura es el guion mediante el system prompt, no la respuesta.

### Patrón de diseño

Cada "personaje" vive en su propio archivo dentro de `/lib/ai/prompts/`:

- `tutor.ts` — retroalimentación general sobre un reto (presupuesto, ahorro)
- `arrendador.ts` — simula al arrendador en el módulo de contrato de arriendo
- `entrevistador.ts` — simula la entrevista de trabajo (roadmap)
- `evaluador-estafa.ts` — sostiene la conversación de estafa y evalúa la respuesta del estudiante

Cada archivo exporta: un system prompt fijo (define el rol, el tono, y límites claros de lo que el personaje puede/no puede hacer) y un schema de salida estructurada. Ejemplo de forma de salida esperada para el tutor:

```ts
{
  puntaje: number,              // 0-100
  categoria_error: string,      // ej: "gasto_hormiga", "no_prioriza_ahorro"
  feedback: string,             // texto breve y personalizado
  ajustar_dificultad: "subir" | "mantener" | "bajar"
}
```

Ningún componente de UI debe construir el prompt directamente — siempre llama a una función de esta capa (`getTutorFeedback()`, `simularArrendador()`, etc.). Esto mantiene cada interacción de IA aislada y modular, lo cual también ayuda a que las sesiones de IA que te ayuden a programar tengan un archivo pequeño y autocontenido para trabajar, en vez de un prompt gigante mezclado en la interfaz.

### Control de costos

- Usa el modelo más económico de la familia Gemini para evaluaciones simples y estructuradas, y uno algo más capaz para simulaciones conversacionales (la negociación con el arrendador, la entrevista) — pero sin salirte de la familia **Flash**: los modelos **Pro** de Gemini dejaron de estar en la capa gratuita desde abril de 2026, y mantener la capa gratuita (sin tarjeta) es justamente el motivo por el que este proyecto usa Gemini. Al momento de escribir esto, los modelos usados son `gemini-flash-lite-latest` (evaluaciones) y `gemini-flash-latest` (simulaciones) — son *alias* flotantes que Google reapunta al Flash/Flash-Lite estable vigente, para no depender de una versión con fecha que se puede apagar. Confirma el catálogo y tu cuota real en [Google AI Studio](https://aistudio.google.com) (`ai.google.dev/gemini-api/docs/models` y `aistudio.google.com/rate-limit`) antes de sustentar — esto cambia seguido y Google ya no publica una tabla fija de límites gratuitos, cada proyecto ve su propia cuota en vivo.
- Usa *prompt caching* para el system prompt de cada personaje (se repite en cada llamada) — reduce costo y latencia.
- Define un límite de intentos de IA por reto por día por estudiante. Además de controlar costo, tiene sentido pedagógico: evita que el estudiante spamee intentos sin pensar.

### Seguridad de contenido (app para menores)

- El system prompt de cada personaje debe fijar límites explícitos de tono y contenido (nunca temas inapropiados para el público, nunca salirse del guion de la simulación aunque el usuario insista).
- Registra (log) las interacciones de IA por reto para poder auditar respuestas problemáticas durante las pruebas.

---

## 6. Alcance: MVP vs. roadmap

### MVP (Fases 0 a 8)

- Motor base: autenticación, perfil, "Mi Vida Simulada" (billetera + gamificación)
- Módulo 1 — Presupuesto personal (grupo Dinero)
- Módulo 2 — Detectar estafas (grupo Seguridad digital)
- Módulo 3 — Contrato de arriendo (grupo Vida independiente)
- Módulo 4 — Ahorro con metas / cuota inicial (grupo Dinero / Vida independiente)
- Eventos aleatorios diarios + notificaciones + ranking básico por colegio/curso

Esto coincide con el MVP que ya habías identificado en el contexto del proyecto (presupuesto, contrato de arriendo, detectar estafa, ahorro/casa propia).

### Roadmap (documentado, no construido en el MVP)

- Resto de "Vida profesional": hoja de vida, simulación de entrevista, emprendimiento y registro ante Cámara de Comercio
- Módulo completo de crédito hipotecario (el MVP solo cubre ahorro para cuota inicial)
- Segundo módulo de seguridad digital: cuidado de datos personales
- Panel B2B para colegios/docentes
- Reportes B2C para padres + suscripciones (freemium)
- Publicidad / contenido patrocinado educativo
- App móvil nativa (si se decide ir más allá de la PWA)
- Internacionalización, CI/CD completo, tests de carga

---

## 7. Seguridad, privacidad y cumplimiento (Ley 1581)

Al tratarse de menores de edad, esto no es opcional. Consideraciones arquitectónicas (no reemplazan una revisión jurídica formal — para el aviso de privacidad y los términos exactos, valida con el área jurídica de tu institución):

- **Consentimiento del acudiente**: desde la Fase 1, el registro captura el correo del acudiente cuando el usuario declara ser menor de edad, y el campo `consentimiento_acudiente` queda en estado `pendiente`. El flujo real de aprobación (correo con enlace de confirmación) se construye en la Fase 8, pero el modelo de datos lo soporta desde el inicio.
- **Minimización de datos**: no se recolecta más información de la necesaria (sin número de identificación, sin dirección física).
- **RLS por defecto**: cada estudiante solo accede a sus propios datos; cualquier vista agregada (rankings) se hace mediante una vista/consulta que expone solo lo estrictamente necesario (nombre y XP total, no datos personales).
- **Derecho de acceso/eliminación**: aunque para el MVP un proceso manual (vía administrador) es aceptable, documenta la intención de dar soporte a solicitudes de acceso y borrado de datos.
- **Variables de entorno y secretos**: las llaves de la API de Gemini y las credenciales de Supabase nunca se exponen en el cliente; solo se usan desde el servidor.

---

## 8. Plan de desarrollo por fases

Cada fase está pensada para completarse con un contexto de IA acotado: solo necesitas darle a la IA el objetivo, el alcance y lo que ya existe de fases anteriores — no todo el proyecto.

| Fase | Nombre | Duración aprox.* | Entregable clave |
|---|---|---|---|
| 0 | Cimientos técnicos y modelo de datos | 1-2 semanas | Repo + DB + despliegue "hola mundo" funcionando |
| 1 | Autenticación, perfiles y navegación | 1 semana | Registro → login → dashboard funcional |
| 2 | Motor de billetera virtual y gamificación | 1 semana | Billetera y XP funcionando y probados |
| 3 | Módulo: Presupuesto personal | 1.5 semanas | Primer módulo 100% jugable, con IA |
| 4 | Módulo: Detectar estafas | 1 semana | Segundo módulo jugable |
| 5 | Módulo: Contrato de arriendo | 1 semana | Tercer módulo jugable |
| 6 | Módulo: Ahorro con metas | 1 semana | MVP de 4 módulos completo |
| 7 | Retención: eventos y notificaciones | 1.5 semanas | Motor de eventos + notificaciones + ranking |
| 8 | Pulido, pruebas y cumplimiento | 1.5 semanas | MVP listo para sustentación |

*\*Estimado asumiendo ~10-15 h/semana en solitario — ajusta según tu ritmo real; lo importante es el orden y el alcance de cada fase, no el número exacto de semanas.*

### Fase 0 — Cimientos técnicos y modelo de datos

- **Objetivo**: tener el esqueleto técnico funcionando de punta a punta antes de construir funcionalidad real.
- **Incluye**: crear repo en GitHub; inicializar Next.js + TypeScript + Tailwind; crear proyecto en Supabase y las tablas núcleo (sección 4); conectar Next.js con Supabase; desplegar un "hola mundo" en Vercel que lea datos reales de Supabase; definir 3-5 componentes base de UI con shadcn/ui.
- **No incluye**: lógica de negocio real, autenticación completa, IA.
- **Entregable**: app desplegada en una URL pública, mostrando una página conectada a la base de datos.

### Fase 1 — Autenticación, perfiles y navegación

- **Objetivo**: que un estudiante pueda registrarse, iniciar sesión, y ver el "shell" de la app.
- **Incluye**: registro/login con Supabase Auth; formulario captura nombre, fecha de nacimiento, colegio (buscar o crear) y curso; si es menor de edad, captura correo del acudiente y marca `consentimiento_acudiente = pendiente`; creación automática del personaje al registrarse; dashboard con navegación a los 4 módulos del MVP (aunque estén vacíos) y barra de XP/nivel visible.
- **No incluye**: contenido real de los retos, IA todavía.
- **Entregable**: flujo completo registro → login → dashboard funcionando en producción.

### Fase 2 — Motor de billetera virtual y gamificación

- **Objetivo**: construir la lógica reutilizable que todos los módulos usarán después.
- **Incluye**: función para registrar transacciones (ingreso/gasto) y actualizar el saldo de forma atómica; función para otorgar XP y subir de nivel; pantalla simple de "estado financiero" (saldo actual + historial); pruebas unitarias de esta lógica — es dinero simulado, tiene que ser confiable.
- **No incluye**: eventos aleatorios automáticos (eso es Fase 7), contenido de módulos todavía.
- **Entregable**: desde una pantalla de prueba puedes simular un ingreso/gasto y ver el saldo y el XP actualizarse de forma persistente y correcta.

### Fase 3 — Módulo: Presupuesto personal

- **Objetivo**: primer módulo de contenido completo — establece el patrón que se repite en los módulos 4, 5 y 6.
- **Incluye**: definir 3-5 retos (ej. distribuir un salario simulado entre categorías, identificar gastos hormiga); UI del reto; conexión con el motor de billetera de la Fase 2 (las decisiones generan transacciones reales); primera integración de IA — función `getTutorFeedback()` que devuelve la salida estructurada de la sección 5; guardar progreso en `progreso_usuario_reto`.
- **No incluye**: los otros 3 módulos.
- **Entregable**: módulo jugable de principio a fin, con retroalimentación real de IA.

### Fase 4 — Módulo: Detectar estafas

- **Objetivo**: segundo módulo — introduce el patrón de "simulación conversacional" con la IA como personaje.
- **Incluye**: 2-4 escenarios de estafa (mensaje, correo, oferta de inversión sospechosa); función `simularEstafador()` que sostiene una conversación breve dentro de un guion controlado; el estudiante decide si es estafa y por qué; retroalimentación de una IA evaluadora.
- **Entregable**: módulo jugable con conversación simulada funcionando.

### Fase 5 — Módulo: Contrato de arriendo

- **Objetivo**: tercer módulo — introduce lectura/comprensión de documentos y otro personaje de IA.
- **Incluye**: contrato de arriendo simulado (realista pero ficticio) con cláusulas que el estudiante debe identificar; preguntas de comprensión; simulación breve de "negociar" un punto del contrato con el arrendador (IA); función `simularArrendador()`.
- **Entregable**: módulo jugable completo.

### Fase 6 — Módulo: Ahorro con metas

- **Objetivo**: cuarto y último módulo del MVP.
- **Incluye**: mecánica de definir una meta de ahorro (ej. cuota inicial de vivienda); aportes periódicos desde el saldo del personaje; proyección simple de tiempo hasta la meta; retroalimentación de IA sobre hábitos de ahorro.
- **Entregable**: módulo jugable — con esto el MVP de 4 módulos queda completo.

### Fase 7 — Retención: eventos aleatorios y notificaciones

- **Objetivo**: activar "Mi Vida Simulada" como mecanismo de uso recurrente.
- **Incluye**: Edge Function programada (cron) que genera 0-2 eventos aleatorios por personaje activo al día (factura, imprevisto, oferta sospechosa); el estudiante debe atender el evento; notificaciones push (o correo) cuando hay un evento pendiente; ranking simple por colegio/curso.
- **Nota**: si sientes que esta fase abarca demasiado para una sola sesión de IA, divídela en 7a (motor de eventos) y 7b (notificaciones + ranking) — el mismo principio de "fases acotadas" aplica dentro de una fase.
- **Entregable**: eventos diarios funcionando en producción, con notificación y ranking visibles.

### Fase 8 — Pulido, pruebas y cumplimiento

- **Objetivo**: dejar el MVP listo para sustentación.
- **Incluye**: pruebas E2E de los 4 flujos de módulos (Playwright); revisión de accesibilidad y responsive; página de política de privacidad + flujo real de consentimiento del acudiente (correo con aprobación); revisión de RLS en cada tabla de Supabase; documentación final (README, diagrama de arquitectura actualizado, manual de usuario corto).
- **Entregable**: MVP estable, documentado y listo para presentar.

---

## 9. Cómo trabajar con IA fase por fase

### Plantilla de contexto para iniciar una fase nueva

Copia esto al inicio de una sesión nueva de IA (chat o Claude Code), completando los corchetes con la info de la fase que sigue en la tabla de la sección 8:

```
CONTEXTO DEL PROYECTO:
Estoy construyendo "preparatorIA", una app educativa (Next.js + TypeScript +
Tailwind + Supabase + API de Gemini) que enseña habilidades de vida adulta a
adolescentes colombianos (15-18 años) mediante retos gamificados.

ESTADO ACTUAL (actualízalo cada vez):
Ya existe: [ej. "auth funcional, dashboard, motor de billetera en lib/wallet.ts,
módulo de presupuesto completo en app/modulos/presupuesto"]

FASE ACTUAL: Fase [X] — [nombre]
OBJETIVO: [pegar de la sección 8]
INCLUYE: [pegar]
NO INCLUYE (no lo construyas todavía): [pegar]
ENTREGABLE ESPERADO: [pegar]

Trabajemos solo en esta fase. Si necesitas ver código de fases anteriores,
pídemelo o revísalo directamente en vez de asumir su contenido.
```

Ejemplo ya resuelto para la Fase 0:

```
FASE ACTUAL: Fase 0 — Cimientos técnicos y modelo de datos
OBJETIVO: tener el esqueleto técnico funcionando de punta a punta antes de
construir funcionalidad real.
INCLUYE: crear repo en GitHub; inicializar Next.js + TypeScript + Tailwind;
crear proyecto en Supabase y las tablas núcleo; conectar Next.js con Supabase;
desplegar un "hola mundo" en Vercel que lea datos reales de Supabase.
NO INCLUYE: lógica de negocio real, autenticación completa, IA.
ENTREGABLE ESPERADO: app desplegada en una URL pública, mostrando una página
conectada a la base de datos.
```

### Buenas prácticas

- **Una sesión (o chat) nueva por fase.** Evita que el historial crezca demasiado y termine "contaminando" el contexto con detalles de fases ya cerradas.
- **Actualiza la sección "Estado actual"** de este documento al terminar cada fase: qué existe, qué decisiones tomaste, qué queda pendiente.
- **Si usas Claude Code**: puede leer el repo directamente, lo cual es más confiable que pegar resúmenes a mano. Basta con decir "lee PLAN_DESARROLLO.md y trabajemos en la Fase 3". Cierra cada fase con un commit — te da puntos de retorno claros si algo sale mal.
- **Si usas el chat normal**: considera crear un Project y subir este documento como conocimiento persistente, para no tener que pegarlo entero cada vez.
- **Revisa el código antes de aceptarlo**, especialmente en la capa de IA (prompts) y en todo lo relacionado con la billetera virtual — son las partes donde un error es más costoso de arrastrar a fases siguientes.
- **Si la IA "alucina"** (inventa una función, tabla o archivo que no existe), es señal de que el contexto que le diste es demasiado amplio o demasiado vago. Vuelve a un alcance más acotado — literalmente el problema que este documento busca evitar.

---

## 10. Próximos pasos inmediatos

1. Crea el repositorio y sigue la Fase 0 tal como está documentada arriba.
2. Si alguno de los 4 módulos del MVP no se siente viable en tu tiempo disponible, ajústalo ahora — es más barato recortar alcance antes de empezar que a mitad de camino.
3. Guarda este documento como `PLAN_DESARROLLO.md` en la raíz del repo para tenerlo disponible en cada sesión de IA.
