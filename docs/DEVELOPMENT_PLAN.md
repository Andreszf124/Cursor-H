# Academic Copilot — Plan de Desarrollo

> **Metodología:** Desarrollo incremental por módulos  
> **Regla:** No avanzar al siguiente módulo sin tests + validación

---

## 1. Resumen de fases

| Fase | Módulos | RF | Duración est. | Entregable |
|------|---------|-----|---------------|------------|
| **0 — Setup** | Infraestructura | — | 1 semana | Proyecto scaffolded, CI, env |
| **1A — Fundacional** | 1, 2 | 20 | 2 semanas | Auth + carrera funcional |
| **1B — Académico base** | 3, 4 | 21 | 2 semanas | PDF + cursos + horario |
| **1C — Contenido** | 6, 17* | 16 | 2 semanas | Materiales + notif. básica |
| **1D — Núcleo pedagógico** | 9, 10 | 18 | 3 semanas | Check-in + brechas |
| **1E — IA** | 11, 13 | 17 | 3 semanas | Tutor RAG + prácticas |
| **1F — Cierre MVP** | 16, 18* | 15 | 1 semana | Progreso + audit |
| **2 — IA avanzada** | 7, 12, 14, 15 | 44 | 4 semanas | Video, plan, recursos |
| **3 — Integraciones** | 5, 8 | 17 | 4 semanas | Campus, Teams, extensión |

\* Slice mínimo, no módulo completo

**Total MVP (Fase 1):** ~14 semanas

---

## 2. Fase 0 — Setup del proyecto

### Objetivos
- Estructura de carpetas frontend/backend/database/docs
- Configuración de herramientas
- CI básico
- Conexión Supabase

### Tareas

| # | Tarea | Entregable |
|---|-------|------------|
| 0.1 | Inicializar monorepo (frontend + backend) | package.json, tsconfig |
| 0.2 | Configurar Vite + React + Tailwind + Router | frontend/ scaffold |
| 0.3 | Configurar Fastify + Zod + TypeScript | backend/ scaffold |
| 0.4 | Configurar Supabase project (Auth, DB, Storage) | Credenciales en .env.example |
| 0.5 | Migración 001: extensions + profiles | database/migrations/ |
| 0.6 | Migración 013: RLS base policies | database/migrations/ |
| 0.7 | Configurar ESLint + Prettier | Ambos proyectos |
| 0.8 | Configurar Vitest (FE) + Vitest (BE) | Test runners |
| 0.9 | GitHub Actions: lint + typecheck + test | .github/workflows/ci.yml |
| 0.10 | README.md con quick start | README.md |

### Criterios de aceptación
- [ ] `npm run dev` inicia frontend y backend
- [ ] `npm test` ejecuta tests (aunque sean 0)
- [ ] `npm run build` compila sin errores
- [ ] CI pasa en push
- [ ] Supabase Auth funciona (smoke test)

---

## 3. Fase 1A — Módulo 1: Auth + Módulo 2: Carrera

### RF cubiertos: RF-001 a RF-020

### Backend

| # | Tarea | Archivos |
|---|-------|----------|
| 1.1 | Módulo auth: register, login, logout | modules/auth/* |
| 1.2 | Módulo auth: forgot/reset password | modules/auth/* |
| 1.3 | Módulo auth: delete account | modules/auth/* |
| 1.4 | Middleware auth (JWT verification) | shared/middleware/auth.middleware.ts |
| 1.5 | Módulo profile: CRUD perfil + avatar | modules/profile/* |
| 1.6 | Módulo profile: learning preferences | modules/profile/* |
| 1.7 | Módulo career: institutions CRUD | modules/career/* |
| 1.8 | Módulo career: careers + student_careers | modules/career/* |
| 1.9 | Módulo career: academic periods | modules/career/* |
| 1.10 | Módulo career: subject status + progress | modules/career/* |
| 1.11 | Migraciones 002–004 | database/migrations/ |
| 1.12 | RLS policies auth + career | database/migrations/013 |

### Frontend

| # | Tarea | Archivos |
|---|-------|----------|
| 1.13 | Feature auth: RegisterPage, LoginPage | features/auth/pages/ |
| 1.14 | Feature auth: ForgotPasswordPage | features/auth/pages/ |
| 1.15 | Feature auth: hooks + services + schemas | features/auth/ |
| 1.16 | Feature profile: ProfilePage, avatar upload | features/profile/ |
| 1.17 | Feature career: CareerSetupPage (wizard) | features/career/ |
| 1.18 | Feature career: AcademicHistoryPage | features/career/ |
| 1.19 | Feature career: ProgressOverview component | features/career/ |
| 1.20 | Router: auth guards, protected routes | app/router/ |
| 1.21 | Layout: AppShell básico | components/layout/ |
| 1.22 | UI components base: Button, Input, Card, Form | components/ui/ |

### Tests

| # | Test | Tipo |
|---|------|------|
| 1.23 | AuthService: register, login, logout | Unit |
| 1.24 | AuthService: delete account | Unit |
| 1.25 | ProfileService: update, avatar | Unit |
| 1.26 | CareerService: setup, periods, progress | Unit |
| 1.27 | Auth API: register/login flow | Integration |
| 1.28 | IDOR: user A no accede perfil de user B | Security |
| 1.29 | RLS: profiles, careers | Security |

### Criterios de aceptación
- [ ] HU-001 a HU-008 completadas
- [ ] RF-001 a RF-020 implementados
- [ ] Tests pasan (>80% coverage módulos auth + career)
- [ ] TypeScript sin errores
- [ ] Lint sin errores
- [ ] Build exitoso
- [ ] Documentación actualizada (TRACEABILITY.md)

---

## 4. Fase 1B — Módulo 3: PDF + Módulo 4: Cursos

### RF cubiertos: RF-021 a RF-041

### Backend

| # | Tarea | Archivos |
|---|-------|----------|
| 2.1 | Módulo curriculum: upload PDF | modules/curriculum/* |
| 2.2 | Job: PDF text extraction | infrastructure/queues/ |
| 2.3 | AIProvider: analyzeContent (plan extraction) | infrastructure/ai/ |
| 2.4 | Módulo curriculum: review + confirm | modules/curriculum/* |
| 2.5 | Módulo curriculum: inconsistencies | modules/curriculum/* |
| 2.6 | Módulo courses: CRUD cursos | modules/courses/* |
| 2.7 | Módulo courses: professors, classrooms | modules/courses/* |
| 2.8 | Módulo schedule: CRUD horarios | modules/schedule/* |
| 2.9 | Módulo schedule: weekly calendar | modules/schedule/* |
| 2.10 | Módulo schedule: upcoming class + end detection | modules/schedule/* |
| 2.11 | Migraciones 004–005 | database/migrations/ |

### Frontend

| # | Tarea | Archivos |
|---|-------|----------|
| 2.12 | Feature curriculum: ImportPage (upload + review) | features/curriculum/ |
| 2.13 | Feature curriculum: SubjectReviewTable | features/curriculum/components/ |
| 2.14 | Feature courses: CoursesPage, CourseForm | features/courses/ |
| 2.15 | Feature schedule: SchedulePage, WeeklyCalendar | features/schedule/ |
| 2.16 | Feature schedule: CourseFormModal | features/schedule/components/ |
| 2.17 | Components: FileUpload, CalendarGrid | components/forms/, components/ui/ |

### Tests

| # | Test | Tipo |
|---|------|------|
| 2.18 | CurriculumService: upload, extract, confirm | Unit + Integration |
| 2.19 | PDF extraction con sample PDF | Integration |
| 2.20 | CourseService + ScheduleService CRUD | Unit |
| 2.21 | Weekly calendar generation | Unit |
| 2.22 | Class end detection logic | Unit |
| 2.23 | File validation (PDF only, size) | Security |

### Criterios de aceptación
- [ ] HU-009 a HU-014 completadas
- [ ] RF-021 a RF-041 implementados
- [ ] Upload PDF → extracción → revisión → confirmación funciona E2E
- [ ] Calendario semanal muestra cursos correctamente
- [ ] Tests pasan

---

## 5. Fase 1C — Módulo 6: Materiales + Notificaciones (slice)

### RF cubiertos: RF-051 a RF-060, RF-146, RF-147

### Backend

| # | Tarea | Archivos |
|---|-------|----------|
| 3.1 | Módulo materials: upload multi-type | modules/materials/* |
| 3.2 | Storage service: Supabase Storage wrapper | infrastructure/storage/ |
| 3.3 | Job: text extraction + chunking | infrastructure/queues/ |
| 3.4 | Job: embedding generation | infrastructure/ai/ |
| 3.5 | Módulo materials: search, delete | modules/materials/* |
| 3.6 | Módulo notifications: create + list (slice) | modules/notifications/* |
| 3.7 | Scheduler: class end detection → notification | infrastructure/queues/ |
| 3.8 | Migraciones 006–007, 011 | database/migrations/ |

### Frontend

| # | Tarea | Archivos |
|---|-------|----------|
| 3.9 | Feature materials: MaterialsPage, upload | features/materials/ |
| 3.10 | Feature materials: MaterialCard, search | features/materials/components/ |
| 3.11 | Feature notifications: NotificationBell | features/notifications/ |
| 3.12 | Components: FileUpload (multi-type), SearchBar | components/ |

### Tests

| # | Test | Tipo |
|---|------|------|
| 3.13 | MaterialService: upload, categorize, search | Unit |
| 3.14 | File validation (all types, MIME, size) | Security |
| 3.15 | Chunking + embedding pipeline | Integration |
| 3.16 | RAG index: chunks stored with student_id | Security |
| 3.17 | Storage quota enforcement | Unit |
| 3.18 | Notification creation on class end | Integration |

### Criterios de aceptación
- [ ] HU-018 a HU-020 completadas
- [ ] RF-051 a RF-060 implementados
- [ ] Upload PDF → chunks → embeddings funciona
- [ ] Búsqueda de materiales funciona
- [ ] Notificación de fin de clase se genera
- [ ] Tests pasan

---

## 6. Fase 1D — Módulo 9: Check-in + Módulo 10: Brechas

### RF cubiertos: RF-081 a RF-098

### Backend

| # | Tarea | Archivos |
|---|-------|----------|
| 4.1 | Módulo checkin: auto-create on class end | modules/checkin/* |
| 4.2 | Módulo checkin: topics (suggest + confirm) | modules/checkin/* |
| 4.3 | Módulo checkin: comprehension + difficulties | modules/checkin/* |
| 4.4 | AIProvider: generateQuestions (diagnostic) | infrastructure/ai/ |
| 4.5 | Módulo checkin: diagnostic submit + analyze | modules/checkin/* |
| 4.6 | Módulo knowledge: concepts CRUD | modules/knowledge/* |
| 4.7 | Módulo knowledge: mastery calculation | modules/knowledge/* |
| 4.8 | Módulo knowledge: gap detection + priority | modules/knowledge/* |
| 4.9 | Migraciones 008–009 | database/migrations/ |

### Frontend

| # | Tarea | Archivos |
|---|-------|----------|
| 4.10 | Feature checkin: CheckinPage (wizard multi-step) | features/checkin/ |
| 4.11 | Feature checkin: TopicSelector, ComprehensionScale | features/checkin/components/ |
| 4.12 | Feature checkin: DiagnosticQuiz | features/checkin/components/ |
| 4.13 | Feature knowledge: GapsPage, GapCard | features/knowledge/ |
| 4.14 | Feature knowledge: MasteryChart | features/knowledge/components/ |
| 4.15 | Dashboard: pending check-in, top gaps | components/layout/ |

### Tests

| # | Test | Tipo |
|---|------|------|
| 4.16 | CheckinService: full flow | Integration |
| 4.17 | Diagnostic question generation | Integration |
| 4.18 | Mastery calculation (weighted average) | Unit |
| 4.19 | Gap detection + prioritization | Unit |
| 4.20 | Prerequisite consideration in gaps | Unit |
| 4.21 | Check-in updates mastery correctly | Integration |

### Criterios de aceptación
- [ ] HU-028 a HU-034 completadas
- [ ] RF-081 a RF-098 implementados
- [ ] Flujo completo: fin de clase → notif → check-in → diagnóstico → brechas
- [ ] Dashboard muestra brechas priorizadas
- [ ] Tests pasan

---

## 7. Fase 1E — Módulo 11: Tutor IA + Módulo 13: Prácticas

### RF cubiertos: RF-099 a RF-106, RF-116 a RF-124

### Backend

| # | Tarea | Archivos |
|---|-------|----------|
| 5.1 | AIProvider: full interface implementation | infrastructure/ai/ |
| 5.2 | RAG service: retrieval + context assembly | infrastructure/ai/rag.service.ts |
| 5.3 | Módulo tutor: conversations + chat | modules/tutor/* |
| 5.4 | Módulo tutor: RAG-powered responses | modules/tutor/* |
| 5.5 | Módulo practice: generate exercises | modules/practice/* |
| 5.6 | Módulo practice: submit + evaluate | modules/practice/* |
| 5.7 | Módulo practice: difficulty adaptation | modules/practice/* |
| 5.8 | Duplicate exercise prevention (hash) | modules/practice/* |
| 5.9 | Migraciones 010 | database/migrations/ |

### Frontend

| # | Tarea | Archivos |
|---|-------|----------|
| 5.10 | Feature tutor: TutorPage (chat UI) | features/tutor/ |
| 5.11 | Feature tutor: MessageBubble, SourceCitation | features/tutor/components/ |
| 5.12 | Feature practice: PracticePage, ExerciseCard | features/practice/ |
| 5.13 | Feature practice: FeedbackPanel | features/practice/components/ |
| 5.14 | Dashboard: "Comenzar práctica" CTA | components/layout/ |

### Tests

| # | Test | Tipo |
|---|------|------|
| 5.15 | RAG: retrieval filtered by student_id | Security |
| 5.16 | TutorService: chat with context | Integration |
| 5.17 | PracticeService: generate + evaluate | Integration |
| 5.18 | Exercise deduplication | Unit |
| 5.19 | Difficulty adaptation logic | Unit |
| 5.20 | AIProvider mock tests | Unit |

### Criterios de aceptación
- [ ] HU-035 a HU-037, HU-041 a HU-044 completadas
- [ ] RF-099 a RF-106, RF-116 a RF-124 implementados
- [ ] Tutor responde usando materiales del estudiante
- [ ] Práctica se genera basada en brechas
- [ ] Retroalimentación en respuestas incorrectas
- [ ] Tests pasan

---

## 8. Fase 1F — Módulo 16: Progreso + Admin (slice)

### RF cubiertos: RF-138 a RF-145, RF-154, RF-158

### Backend

| # | Tarea | Archivos |
|---|-------|----------|
| 6.1 | Módulo progress: overview aggregation | modules/progress/* |
| 6.2 | Módulo progress: by-subject, by-concept | modules/progress/* |
| 6.3 | Módulo progress: evolution, study time | modules/progress/* |
| 6.4 | Audit log middleware | shared/middleware/ |
| 6.5 | Migraciones 012 | database/migrations/ |

### Frontend

| # | Tarea | Archivos |
|---|-------|----------|
| 6.6 | Feature progress: ProgressPage | features/progress/ |
| 6.7 | Feature progress: charts (mastery, evolution) | features/progress/components/ |
| 6.8 | Dashboard completo (MVP) | app/ — DashboardPage |
| 6.9 | Components: charts (ProgressChart, MasteryChart) | components/charts/ |

### Tests

| # | Test | Tipo |
|---|------|------|
| 6.10 | ProgressService: all aggregations | Unit |
| 6.11 | Dashboard data integration | Integration |
| 6.12 | Audit log creation | Unit |

### Criterios de aceptación MVP
- [ ] HU-051 a HU-053 completadas
- [ ] RF-138 a RF-145 implementados
- [ ] Dashboard MVP funcional (próxima clase, check-in, brechas, práctica, progreso)
- [ ] Audit logs registran acciones sensibles
- [ ] **Demo E2E completa funciona**
- [ ] Todos los tests pasan
- [ ] TRACEABILITY.md actualizado al 100% MVP

---

## 9. Fase 2 — IA avanzada (post-MVP)

| Módulo | RF | Prioridad |
|--------|-----|-----------|
| 7 — Videos/clases | RF-061–072 | Alta |
| 12 — Plan aprendizaje | RF-107–115 | Alta |
| 15 — Preparación pre-clase | RF-131–137 | Media |
| 14 — Recursos educativos | RF-125–130 | Media |
| 17 — Notificaciones completo | RF-148–151 | Media |

### Entregables Fase 2
- Pipeline completo de video (upload → transcripción → análisis)
- Plan de estudio personalizado con actividades
- Recomendación pre-clase
- Recursos educativos con fuentes confiables
- Configuración completa de notificaciones

---

## 10. Fase 3 — Integraciones (post-MVP)

| Módulo | RF | Prioridad |
|--------|-----|-----------|
| 5 — Campus Virtual | RF-042–050 | Media |
| 8 — Microsoft Teams | RF-073–080 | Baja |
| 18 — Admin completo | RF-152–157 | Media |

### Entregables Fase 3
- Extensión Chrome/Edge
- Conexión Campus Virtual (OAuth)
- Conexión Microsoft Teams (Graph API)
- Panel de administración

---

## 11. Definición de "Done" por módulo

Un módulo se considera completado cuando:

- [ ] Todos los RF del módulo implementados
- [ ] Historias de usuario asociadas verificables manualmente
- [ ] Tests unitarios para services (>80% coverage)
- [ ] Tests de integración para API endpoints
- [ ] Tests de seguridad (IDOR, RLS) donde aplique — **bloquean CI**
- [ ] TypeScript compila sin errores
- [ ] Lint pasa
- [ ] Build exitoso
- [ ] RLS policies aplicadas y verificadas
- [ ] Gate de seguridad del módulo completado ([SECURITY.md §21](./SECURITY.md#21-gate-de-seguridad-por-módulo-obligatorio))
- [ ] `npm audit` sin critical/high
- [ ] TRACEABILITY.md actualizado
- [ ] No regresiones en módulos anteriores

---

## 12. Git workflow

### Convención de commits

```
feat(auth): implement student registration
feat(auth): implement login and logout
feat(career): add institution selection
feat(curriculum): implement PDF upload and extraction
fix(auth): resolve session expiration on refresh
test(checkin): add diagnostic flow integration tests
docs: update traceability for module 4
```

### Branching

```
main ─── protegida, deploy a producción
  └── develop ─── integración
        ├── feat/module-1-auth
        ├── feat/module-2-career
        ├── feat/module-3-curriculum
        └── ...
```

---

## 13. CI/CD Pipeline

```yaml
# .github/workflows/ci.yml (propuesta)
on: [push, pull_request]
jobs:
  lint:
    - npm run lint (frontend + backend)
  typecheck:
    - npm run typecheck (frontend + backend)
  test:
    - npm test (frontend + backend)
  build:
    - npm run build (frontend + backend)
  security:
    - npm audit --audit-level=high
    - npm run test:security   # IDOR, RLS, RAG isolation — bloquea merge
    - gitleaks detect         # secretos en código
```

### Deploy

| Entorno | Frontend | Backend | Trigger |
|---------|----------|---------|---------|
| Development | localhost:5173 | localhost:3000 | local |
| Staging | Vercel preview | Staging service | PR merge to develop |
| Production | Vercel | Production service | merge to main |

---

## 14. Referencias

- [ANALYSIS.md](./ANALYSIS.md) — Dependencias y riesgos
- [ARCHITECTURE.md](./ARCHITECTURE.md) — Estructura técnica
- [TRACEABILITY.md](./TRACEABILITY.md) — RF → implementación
