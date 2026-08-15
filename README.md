# Academic Copilot

Plataforma de acompañamiento académico personalizado para estudiantes universitarios.

## Estado del proyecto

**Fase actual:** Fase 0 completada (scaffold + tooling). Próximo paso: Fase 1A — Módulo 1 (autenticación y usuarios).

## Stack tecnológico

- **Frontend:** React, Vite, TypeScript, Tailwind CSS v4, React Router, Zustand, TanStack Query, React Hook Form, Zod
- **Backend:** Node.js, Fastify, TypeScript, Zod
- **Database:** Supabase (PostgreSQL + Auth + Storage + RLS + pgvector)
- **Deploy:** Vercel (frontend) + servicio Node.js (backend)

## Quick Start

Requisitos: Node.js >= 20.12, npm, proyecto Supabase creado en [supabase.com](https://supabase.com).

```bash
# 1. Clonar e instalar
git clone https://github.com/Andreszf124/Cursor-H.git
cd Cursor-H
npm install

# 2. Configurar variables de entorno (reemplazar placeholders con credenciales reales)
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env

# 3. Aplicar migraciones de base de datos (ver database/README.md)

# 4. Iniciar desarrollo (frontend :5173 + backend :3000)
npm run dev
```

## Comandos

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Frontend (5173) + backend (3000) en paralelo |
| `npm run build` | Build de producción de ambos proyectos |
| `npm test` | Tests de ambos proyectos (Vitest) |
| `npm run lint` | ESLint en ambos proyectos |
| `npm run typecheck` | TypeScript strict en ambos proyectos |
| `npm run format` | Prettier sobre todo el repo |

## Estructura

```
academic-copilot/
├── frontend/          # React SPA — Feature-Based Architecture
│   └── src/
│       ├── app/       # router, providers, config (env validado con Zod)
│       ├── components/# ui, forms, charts, layout, feedback
│       ├── features/  # 15 features (auth, checkin, tutor, practice...)
│       └── services/  # api (cliente Supabase anon), storage, analytics
├── backend/           # Fastify API — Modular por dominio
│   └── src/
│       ├── config/    # env.ts — validación Zod, falla si faltan vars
│       ├── modules/   # 16 módulos de dominio (Fase 1A+)
│       ├── infrastructure/ # database (clientes Supabase), storage, ai, queues
│       └── shared/    # middleware, errors, utils, types
├── database/          # Migraciones SQL idempotentes + guía Supabase CLI
├── docs/              # Documentación de diseño del sistema
└── .github/workflows/ # CI: lint, typecheck, test, build, audit, gitleaks
```

## Seguridad (innegociable)

- `SUPABASE_SERVICE_ROLE_KEY` **solo en backend** — CI falla si aparece en el build del frontend
- Frontend solo usa variables `VITE_*` públicas (anon key)
- TypeScript strict sin `any` (bloqueado por lint)
- Variables de entorno validadas con Zod — el backend no arranca si faltan
- RLS habilitado en toda tabla con datos de estudiante
- Detalle completo: [docs/SECURITY.md](./docs/SECURITY.md)

## Documentación

| Documento | Descripción |
|-----------|-------------|
| [ANALYSIS.md](./docs/ANALYSIS.md) | Análisis de requerimientos, entidades, riesgos |
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Arquitectura del sistema |
| [DATABASE.md](./docs/DATABASE.md) | Modelo de datos PostgreSQL |
| [API.md](./docs/API.md) | Contratos REST `/api/v1` |
| [SECURITY.md](./docs/SECURITY.md) | Seguridad, RLS, validación |
| [AI_ARCHITECTURE.md](./docs/AI_ARCHITECTURE.md) | IA, RAG, motor de conocimiento |
| [DEVELOPMENT_PLAN.md](./docs/DEVELOPMENT_PLAN.md) | Plan incremental por fases |
| [TRACEABILITY.md](./docs/TRACEABILITY.md) | Matriz RF → HU → código → test |

## Requerimientos

18 módulos · 148 requerimientos funcionales · 59 historias de usuario.
Fuente: `Documentacion/🎓 ACADEMIC COPILOT.txt`
