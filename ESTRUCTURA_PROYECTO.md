# preparatorIA — Estructura de carpetas

Generado directamente desde el proyecto real (no es un esquema aspiracional como el de la sección 3 de `PLAN_DESARROLLO.md` — esto es lo que existe hoy, después de las Fases 0-8 más las extensiones de modo oscuro y responsive). Actualízalo si la estructura cambia mucho más adelante.

## Cómo leerlo

Cada ruta de la app sigue el mismo patrón de 3 archivos, así que en vez de anotar los ~45 archivos de rutas uno por uno, aquí está la convención una sola vez:

| Archivo | Rol |
|---|---|
| `page.tsx` | Server Component — trae los datos de Supabase y decide qué mostrar. |
| `actions.ts` | Server Actions — la lógica de servidor (llama a `lib/`, nunca al revés). |
| `*-form.tsx` / componente con nombre propio | Client Component — la parte interactiva (formularios, chat). |

## Resumen por carpeta

- **`app/`** — rutas de Next.js (App Router). `(auth)` agrupa login/registro sin afectar la URL; `dashboard/` es todo lo que requiere sesión; `consentimiento/[token]` y `privacidad/` son públicas.
  - `dashboard/modulos/` — los 4 módulos del MVP, cada uno con sus retos como subcarpetas.
- **`components/ui/`** — el sistema de diseño (Button, Card, Badge, ProgressBar) — los mismos 4 componentes de la Fase 0, reutilizados en todo el proyecto.
- **`components/`** (raíz) — piezas compartidas entre módulos: `feedback-card.tsx` (retroalimentación de IA), `theme-system-listener.tsx` (modo oscuro).
- **`lib/`** — toda la lógica de negocio, organizada por dominio (`wallet`, `gamification`, `presupuesto`, `estafas`, `contrato`, `ahorro`, `eventos`, `theme`). Cada archivo de lógica pura tiene su `.test.ts` al lado.
  - `lib/ai/` — la capa de IA: `client.ts` (config + modelos), `prompts/` (tutor, estafador, arrendador), `schemas/` (salidas estructuradas).
  - `lib/supabase/` — los 3 clientes (browser, server, middleware) de la Fase 1.
- **`supabase/migrations/`** — las 9 migraciones SQL, en orden — es la fuente de verdad del modelo de datos.
- **`e2e/`** — pruebas de Playwright (end-to-end).
- **`types/database.ts`** — los tipos de TypeScript de cada tabla.
- Raíz del proyecto — configuración (`next.config.ts`, `tsconfig.json`, `playwright.config.ts`, `vitest.config.ts`, `postcss.config.mjs`), `proxy.ts` (sesión de Supabase en cada request), y la documentación (`README.md`, `PLAN_DESARROLLO.md`, `MANUAL_USUARIO.md`).

## Árbol completo

```
preparatoria/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   ├── actions.ts
│   │   │   └── page.tsx
│   │   ├── registro/
│   │   │   ├── actions.ts
│   │   │   ├── page.tsx
│   │   │   └── registro-form.tsx
│   │   └── layout.tsx
│   ├── consentimiento/
│   │   └── [token]/
│   │       ├── actions.ts
│   │       ├── botones-consentimiento.tsx
│   │       └── page.tsx
│   ├── dashboard/
│   │   ├── ajustes/
│   │   │   ├── page.tsx
│   │   │   └── tema-selector.tsx
│   │   ├── billetera/
│   │   │   ├── actions.ts
│   │   │   ├── billetera-form.tsx
│   │   │   └── page.tsx
│   │   ├── eventos/
│   │   │   ├── actions.ts
│   │   │   ├── eventos-lista.tsx
│   │   │   └── page.tsx
│   │   ├── modulos/
│   │   │   ├── ahorro-metas/
│   │   │   │   ├── meta-de-ahorro/
│   │   │   │   │   ├── actions.ts
│   │   │   │   │   ├── crear-meta-form.tsx
│   │   │   │   │   ├── meta-tracker.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── contrato-arriendo/
│   │   │   │   ├── leer-contrato/
│   │   │   │   │   ├── actions.ts
│   │   │   │   │   ├── leer-contrato-form.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── negociar-arrendador/
│   │   │   │   │   ├── actions.ts
│   │   │   │   │   ├── negociacion-arrendador.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── detectar-estafas/
│   │   │   │   ├── [retoSlug]/
│   │   │   │   │   ├── actions.ts
│   │   │   │   │   ├── escenario-estafa.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   └── presupuesto-personal/
│   │   │       ├── distribuir-salario/
│   │   │       │   ├── actions.ts
│   │   │       │   ├── distribuir-salario-form.tsx
│   │   │       │   └── page.tsx
│   │   │       ├── gastos-hormiga/
│   │   │       │   ├── actions.ts
│   │   │       │   ├── gastos-hormiga-form.tsx
│   │   │       │   └── page.tsx
│   │   │       ├── priorizar-gastos/
│   │   │       │   ├── actions.ts
│   │   │       │   ├── page.tsx
│   │   │       │   └── priorizar-gastos-form.tsx
│   │   │       └── page.tsx
│   │   ├── ranking/
│   │   │   └── page.tsx
│   │   ├── actions.ts
│   │   └── page.tsx
│   ├── privacidad/
│   │   └── page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── progress-bar.tsx
│   ├── feedback-card.tsx
│   └── theme-system-listener.tsx
├── e2e/
│   ├── flujos-modulos.spec.ts
│   ├── navegacion-publica.spec.ts
│   └── responsive.spec.ts
├── lib/
│   ├── ai/
│   │   ├── prompts/
│   │   │   ├── arrendador.ts
│   │   │   ├── estafador.ts
│   │   │   └── tutor.ts
│   │   ├── schemas/
│   │   │   └── tutor.ts
│   │   └── client.ts
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── middleware.ts
│   │   └── server.ts
│   ├── ahorro.test.ts
│   ├── ahorro.ts
│   ├── contrato.test.ts
│   ├── contrato.ts
│   ├── email.ts
│   ├── estafas.test.ts
│   ├── estafas.ts
│   ├── eventos.test.ts
│   ├── eventos.ts
│   ├── gamification.test.ts
│   ├── gamification.ts
│   ├── presupuesto.test.ts
│   ├── presupuesto.ts
│   ├── retos.ts
│   ├── theme.test.ts
│   ├── theme.ts
│   ├── utils.ts
│   ├── wallet.test.ts
│   └── wallet.ts
├── supabase/
│   └── migrations/
│       ├── 0001_core_schema.sql
│       ├── 0002_auth_perfil_trigger.sql
│       ├── 0003_wallet_functions.sql
│       ├── 0004_modulos_retos.sql
│       ├── 0005_modulo_estafas.sql
│       ├── 0006_modulo_contrato.sql
│       ├── 0007_modulo_ahorro.sql
│       ├── 0008_eventos_ranking.sql
│       └── 0009_consentimiento_y_rls.sql
├── types/
│   └── database.ts
├── .env.example
├── .gitignore
├── MANUAL_USUARIO.md
├── PLAN_DESARROLLO.md
├── README.md
├── next-env.d.ts
├── next.config.ts
├── package-lock.json
├── package.json
├── playwright.config.ts
├── postcss.config.mjs
├── proxy.ts
├── tsconfig.json
└── vitest.config.ts
```

## En números

- **110 archivos** de código/configuración/documentación (sin contar `node_modules`).
- **21 rutas** (`page.tsx`).
- **9 migraciones** SQL, en orden de aplicación.
- **8 archivos de prueba** unitarios (84 pruebas con Vitest) + 3 archivos de pruebas E2E (44 pruebas con Playwright, entre desktop y mobile).
- **3 "personajes"/usos de IA**: `tutor.ts` (evaluación estructurada), `estafador.ts` y `arrendador.ts` (simulación conversacional).
