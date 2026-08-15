# Academic Copilot

Plataforma de acompañamiento académico personalizado para estudiantes universitarios.

## Estado del proyecto

**Fase actual:** Diseño de arquitectura (sin implementación funcional)

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

## Stack tecnológico

- **Frontend:** React, Vite, TypeScript, Tailwind CSS, Zustand, TanStack Query
- **Backend:** Node.js, Fastify, TypeScript, Zod
- **Database:** Supabase (PostgreSQL + Auth + Storage + RLS)
- **Deploy:** Vercel (frontend) + Node.js service (backend)

## Estructura (planificada)

```
academic-copilot/
├── frontend/          # React SPA — Feature-Based Architecture
├── backend/           # Fastify API — Modular por dominio
├── database/          # Migraciones SQL, seeds, RLS
├── docs/              # Documentación del sistema
└── README.md
```

## Requerimientos

- 18 módulos
- 148 requerimientos funcionales
- 59 historias de usuario

Fuente: `Documentacion/🎓 ACADEMIC COPILOT.txt`

## MVP

Módulos incluidos: Auth, Carrera, PDF, Cursos/Horario, Materiales, Check-in, Brechas, Tutor IA, Prácticas, Progreso.

Ver [DEVELOPMENT_PLAN.md](./docs/DEVELOPMENT_PLAN.md) para el plan completo.

## Quick Start

> Pendiente — se habilitará al completar Fase 0 (Setup).

```bash
# Próximamente
git clone <repo>
cd academic-copilot
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
npm install
npm run dev
```
