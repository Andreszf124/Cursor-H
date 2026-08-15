# Academic Copilot — Arquitectura del Sistema

> **Estado:** Propuesta de diseño  
> **Versión:** 0.1.0

---

## 1. Visión arquitectónica

Academic Copilot sigue una arquitectura **cliente-servidor desacoplada** con procesamiento asíncrono para cargas pesadas (PDF, video, embeddings). La seguridad se implementa en **tres capas**: RLS (PostgreSQL), autorización backend y validación de entrada.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENTE (Vercel)                              │
│  React + Vite + TypeScript + Tailwind + Zustand + TanStack Query        │
│  Feature-Based Architecture                                             │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ HTTPS / REST /api/v1
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      BACKEND (Node.js Service)                          │
│  Fastify + TypeScript + Zod                                             │
│  Arquitectura modular por dominio/feature                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │  Auth    │ │ Courses  │ │Materials │ │ Checkin  │ │  Tutor   │ ... │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘       │
│       └────────────┴────────────┴────────────┴────────────┘             │
│                              │                                          │
│                    ┌─────────┴─────────┐                                │
│                    │   Infrastructure   │                                │
│                    │ DB │ Storage │ AI │ Queues                         │
│                    └─────────┬─────────┘                                │
└──────────────────────────────┼──────────────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
┌───────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Supabase    │    │ Supabase Storage │    │  AI Provider    │
│  PostgreSQL   │    │   (archivos)     │    │  (abstracto)    │
│  + Auth + RLS │    │                  │    │                 │
└───────────────┘    └─────────────────┘    └─────────────────┘
                               │
                               ▼
                    ┌─────────────────┐
                    │  Job Queue       │
                    │  (procesamiento) │
                    └─────────────────┘
```

---

## 2. Principios arquitectónicos

| # | Principio | Implementación |
|---|-----------|----------------|
| 1 | Separación FE/BE | Repos independientes en monorepo |
| 2 | Feature isolation | Lógica de dominio dentro de su feature/módulo |
| 3 | Seguridad en profundidad | RLS + middleware auth + ownership checks |
| 4 | Async by default (heavy work) | Jobs para PDF, embeddings, video |
| 5 | Provider abstraction | `AIProvider` intercambiable |
| 6 | API versionada | `/api/v1/*` |
| 7 | Validación dual | Zod en FE y BE |
| 8 | Trazabilidad | RF → HU → módulo → endpoint → test |
| 9 | Fail secure | Errores genéricos al cliente, detalle en logs |
| 10 | Incremental delivery | MVP por módulos con tests |

---

## 3. Estructura del proyecto

```
academic-copilot/
├── frontend/                 # React SPA (Vercel)
├── backend/                  # Fastify API (Node.js service)
├── database/                 # Migraciones SQL, seeds, RLS policies
├── docs/                     # Documentación del sistema
└── README.md
```

---

## 4. Arquitectura Frontend

### 4.1 Patrón: Feature-Based Architecture

Cada feature es un bounded context con sus propios componentes, páginas, hooks, servicios, schemas y types. Los componentes globales (`components/ui`, `layout`) son **presentacionales y reutilizables**, sin lógica de negocio específica.

```
frontend/
├── src/
│   ├── app/
│   │   ├── router/           # React Router — rutas y guards
│   │   ├── providers/        # QueryClient, Auth, Theme, i18n
│   │   └── config/           # env, constants, feature flags
│   │
│   ├── components/
│   │   ├── ui/               # Button, Input, Card, Modal, Badge...
│   │   ├── forms/            # FormField, FormError, FileUpload...
│   │   ├── charts/           # ProgressChart, MasteryChart...
│   │   ├── layout/           # AppShell, Sidebar, Header, DashboardLayout
│   │   └── feedback/         # Toast, Loading, EmptyState, ErrorBoundary
│   │
│   ├── features/
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   ├── pages/        # LoginPage, RegisterPage, ForgotPasswordPage
│   │   │   ├── hooks/        # useAuth, useSession
│   │   │   ├── services/     # authService.ts
│   │   │   ├── schemas/      # loginSchema, registerSchema
│   │   │   ├── types/
│   │   │   ├── tests/
│   │   │   └── index.ts
│   │   ├── profile/
│   │   ├── career/
│   │   ├── curriculum/
│   │   ├── courses/
│   │   ├── schedule/
│   │   ├── materials/
│   │   ├── classes/
│   │   ├── checkin/
│   │   ├── knowledge/
│   │   ├── tutor/
│   │   ├── practice/
│   │   ├── resources/
│   │   ├── progress/
│   │   └── notifications/
│   │
│   ├── services/
│   │   ├── api/              # apiClient, interceptors, error handling
│   │   ├── storage/          # Supabase Storage client wrapper
│   │   └── analytics/        # Event tracking (futuro)
│   │
│   ├── stores/               # Zustand — estado UI global (sidebar, theme)
│   ├── hooks/                # Hooks transversales (useDebounce, useMediaQuery)
│   ├── types/                # Tipos compartidos globales
│   ├── utils/                # formatDate, cn(), validators
│   └── main.tsx
│
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── .env.example
└── package.json
```

### 4.2 Flujo de datos Frontend

```
Page → Hook (TanStack Query / custom) → Feature Service → API Client → Backend
                ↓
         Zustand (solo UI state)
                ↓
         React Hook Form + Zod (forms)
```

**Reglas:**
- TanStack Query para **server state** (cache, refetch, mutations)
- Zustand solo para **UI state** (no duplicar datos del servidor)
- Supabase Auth SDK en frontend **solo para sesión**; operaciones sensibles vía backend
- Cada feature exporta su API pública via `index.ts`

### 4.3 Rutas principales (propuesta)

| Ruta | Feature | Fase |
|------|---------|------|
| `/login`, `/register`, `/forgot-password` | auth | MVP |
| `/profile` | profile | MVP |
| `/career/setup` | career | MVP |
| `/curriculum/import` | curriculum | MVP |
| `/courses` | courses | MVP |
| `/schedule` | schedule | MVP |
| `/materials` | materials | MVP |
| `/checkin/:id` | checkin | MVP |
| `/knowledge/gaps` | knowledge | MVP |
| `/tutor` | tutor | MVP |
| `/practice` | practice | MVP |
| `/progress` | progress | MVP |
| `/dashboard` | layout (agregador) | MVP |
| `/notifications/settings` | notifications | Fase 2 |
| `/resources` | resources | Fase 2 |
| `/classes/:id/video` | classes | Fase 2 |

---

## 5. Arquitectura Backend

### 5.1 Patrón: Modular por dominio

Cada módulo encapsula routes → handlers → services → repositories. Las rutas **no contienen lógica de negocio**.

```
backend/
├── src/
│   ├── config/
│   │   ├── env.ts            # Validación Zod de variables de entorno
│   │   ├── cors.ts
│   │   └── logger.ts
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.handlers.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.repository.ts
│   │   │   ├── auth.schemas.ts
│   │   │   ├── auth.types.ts
│   │   │   └── auth.test.ts
│   │   ├── users/
│   │   ├── profile/
│   │   ├── career/
│   │   ├── curriculum/
│   │   ├── courses/
│   │   ├── schedule/
│   │   ├── materials/
│   │   ├── classes/
│   │   ├── checkin/
│   │   ├── knowledge/
│   │   ├── tutor/
│   │   ├── practice/
│   │   ├── resources/
│   │   ├── progress/
│   │   └── notifications/
│   │
│   ├── infrastructure/
│   │   ├── database/
│   │   │   ├── supabase.client.ts
│   │   │   └── migrations/
│   │   ├── storage/
│   │   │   └── storage.service.ts
│   │   ├── ai/
│   │   │   ├── ai-provider.interface.ts
│   │   │   ├── openai.provider.ts      # Implementación inicial
│   │   │   └── ai.factory.ts
│   │   └── queues/
│   │       ├── queue.interface.ts
│   │       └── in-memory.queue.ts      # MVP; migrar a Redis/BullMQ
│   │
│   ├── shared/
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── rate-limit.middleware.ts
│   │   │   └── error-handler.middleware.ts
│   │   ├── errors/
│   │   │   ├── app-error.ts
│   │   │   └── error-codes.ts
│   │   ├── utils/
│   │   └── types/
│   │
│   └── server.ts
│
├── .env.example
├── package.json
└── tsconfig.json
```

### 5.2 Flujo de request Backend

```
HTTP Request
  → Rate Limiter
  → CORS
  → Auth Middleware (JWT Supabase)
  → Route Handler (validación Zod input)
  → Service (lógica de negocio)
  → Repository (Supabase client / SQL)
  → Response (DTO tipado)
```

### 5.3 Patrón Repository

Los repositories encapsulan el acceso a Supabase/PostgreSQL. Los services **nunca** construyen queries directamente.

```typescript
// Ejemplo conceptual — NO es código implementado
interface CourseRepository {
  findByStudentId(studentId: string): Promise<Course[]>;
  findById(id: string, studentId: string): Promise<Course | null>;
  create(data: CreateCourseDTO, studentId: string): Promise<Course>;
}
```

---

## 6. Arquitectura de procesamiento async

### 6.1 Pipeline de documentos

```
UPLOAD (HTTP) → VALIDATION → STORAGE (Supabase) → JOB ENQUEUED
                                                      ↓
                                            TEXT EXTRACTION
                                                      ↓
                                            CHUNKING → METADATA
                                                      ↓
                                            EMBEDDINGS → INDEXING
                                                      ↓
                                            STATUS: completed
```

### 6.2 Pipeline de videos (Fase 2)

```
UPLOAD → VALIDATION → STORAGE → JOB ENQUEUED
                                    ↓
                          AUDIO EXTRACTION
                                    ↓
                          TRANSCRIPTION
                                    ↓
                    TOPIC/CONCEPT DETECTION
                                    ↓
                    SUMMARY + KEYWORDS + TIMESTAMPS
                                    ↓
                    EXERCISES → INDEXING
```

### 6.3 Cola de jobs (MVP → Producción)

| Fase | Implementación | Jobs |
|------|----------------|------|
| MVP | In-memory / DB-backed polling | PDF extract, embeddings |
| Producción | BullMQ + Redis | + video, transcripción |

Estados de job: `pending` → `processing` → `completed` | `failed`

---

## 7. Arquitectura RAG (Tutor IA)

```
Student Question
      ↓
Query Embedding (AIProvider.generateEmbeddings)
      ↓
Vector Search (filtered by student_id, course_id?, subject_id?)
      ↓
Top-K Chunks Retrieved
      ↓
Context Assembly + System Prompt
      ↓
LLM Generation (AIProvider.generateText)
      ↓
Response + Source References
```

**Regla crítica:** El filtro por `student_id` es obligatorio en cada búsqueda vectorial. Nunca confiar solo en el prompt para aislar datos.

---

## 8. Arquitectura de autenticación

```
Frontend                          Backend                    Supabase Auth
   │                                 │                            │
   ├── Register ──────────────────►  ├── signUp ────────────────► │
   ├── Login ─────────────────────►  ├── signIn ────────────────► │
   │                                 │                            │
   │◄── JWT (access + refresh) ──────┤◄── session ────────────────┤
   │                                 │                            │
   ├── API calls (Bearer JWT) ──────►├── verify JWT ─────────────►│
   │                                 ├── extract user_id          │
   │                                 └── authorize resource       │
```

- Contraseñas: **solo Supabase Auth** (nunca en tablas propias)
- Backend verifica JWT en cada request autenticado
- RLS usa `auth.uid()` como `student_id`

---

## 9. Arquitectura de despliegue

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Vercel    │     │  Node.js Service  │     │    Supabase     │
│  (Frontend) │────►│  (Railway/Fly/    │────►│  Auth + DB +    │
│             │     │   Render/AWS)     │     │  Storage        │
└─────────────┘     └──────────────────┘     └─────────────────┘
                           │
                           ▼
                    ┌─────────────────┐
                    │  AI Provider API │
                    │  (OpenAI/etc.)   │
                    └─────────────────┘
```

| Componente | Plataforma | Notas |
|------------|------------|-------|
| Frontend | Vercel | SPA, env vars públicas |
| Backend | Node.js compatible | Fastify, env vars secretas |
| DB + Auth | Supabase | PostgreSQL, RLS |
| Storage | Supabase Storage | Buckets por tipo |
| Jobs | Backend worker process | Mismo servicio o worker separado |
| CDN | Vercel Edge | Assets estáticos |

---

## 10. Comunicación entre módulos

### 10.1 Síncrona (HTTP REST)
- CRUD de entidades
- Consultas de progreso/brechas
- Chat tutor (con streaming futuro)

### 10.2 Asíncrona (Jobs/Events)
- Procesamiento PDF/video
- Generación embeddings
- Notificaciones programadas (fin de clase)
- Cálculo de dominio post check-in

### 10.3 Eventos internos (propuesta)

| Evento | Emisor | Consumidor |
|--------|--------|------------|
| `class.ended` | Scheduler | Check-in, Notifications |
| `checkin.completed` | Check-in | Knowledge, Practice |
| `material.processed` | Materials | Tutor (RAG index) |
| `mastery.updated` | Knowledge | Progress, Learning Plan |
| `gap.detected` | Knowledge | Tutor, Practice, Dashboard |

---

## 11. Decisiones tecnológicas (ADRs resumidos)

| Decisión | Alternativas | Elección | Razón |
|----------|-------------|----------|-------|
| Frontend framework | Next.js, Remix | **React + Vite** | Definido en stack; SPA suficiente para MVP |
| State management | Redux, Context | **Zustand + TanStack Query** | Separación server/UI state |
| Backend framework | Express, Hono | **Fastify** | Definido; performance + schema validation |
| Base de datos | Firebase, MongoDB | **Supabase/PostgreSQL** | Relacional, RLS, Auth integrado |
| Auth | Custom JWT | **Supabase Auth** | RF explícito; no almacenar passwords |
| ORM | Prisma, Drizzle | **Supabase JS + SQL migrations** | RLS nativo, menos abstracción |
| AI | Acoplado OpenAI | **AIProvider abstracto** | Requisito de desacoplamiento |
| Cola MVP | Redis/BullMQ | **DB-backed polling** | Simplicidad; migrar después |
| Vector search | Pinecone | **pgvector (Supabase)** | Co-location con datos; filtro RLS |

---

## 12. Diagrama de secuencia — Check-in (MVP)

```
Estudiante    Frontend       Backend         Scheduler      AI         DB
    │             │              │                │           │          │
    │             │              │◄── class.ended ─┤           │          │
    │             │              │── create checkin ──────────────────────►│
    │             │◄── notif ────┤                │           │          │
    │── open ────►│              │                │           │          │
    │             │── GET checkin►│               │           │          │
    │             │◄── topics ────┤── suggest ────────────────►│          │
    │── submit ──►│── POST ──────►│               │           │          │
    │             │              │── diagnostic ──────────────►│          │
    │             │              │── analyze ─────────────────►│          │
    │             │              │── update mastery ─────────────────────►│
    │             │              │── detect gaps ─────────────────────────►│
    │             │◄── results ──┤               │           │          │
```

---

## 13. Referencias

- [DATABASE.md](./DATABASE.md) — Modelo de datos
- [API.md](./API.md) — Contratos REST
- [SECURITY.md](./SECURITY.md) — Controles de seguridad
- [AI_ARCHITECTURE.md](./AI_ARCHITECTURE.md) — IA y RAG
- [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) — Fases de implementación
