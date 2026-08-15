# Academic Copilot — API REST

> **Base URL:** `/api/v1`  
> **Formato:** JSON  
> **Autenticación:** Bearer JWT (Supabase)  
> **Validación:** Zod schemas en backend

---

## 1. Convenciones

| Aspecto | Convención |
|---------|------------|
| Versionado | `/api/v1/` prefix |
| IDs | UUID en path y body |
| Timestamps | ISO 8601 UTC |
| Paginación | `?page=1&limit=20` → `{ data, meta: { page, limit, total } }` |
| Errores | `{ error: { code, message, details? } }` |
| Auth header | `Authorization: Bearer <jwt>` |
| Content upload | `multipart/form-data` para archivos |

### Códigos HTTP

| Código | Uso |
|--------|-----|
| 200 | OK |
| 201 | Created |
| 204 | No Content (delete) |
| 400 | Bad Request / validación |
| 401 | No autenticado |
| 403 | No autorizado (ownership) |
| 404 | No encontrado |
| 409 | Conflicto (duplicado) |
| 422 | Entidad no procesable |
| 429 | Rate limit excedido |
| 500 | Error interno |

---

## 2. Autenticación — `/api/v1/auth`

| Método | Endpoint | RF | Descripción | Auth |
|--------|----------|-----|-------------|------|
| POST | `/auth/register` | RF-001 | Registro email/password | No |
| POST | `/auth/login` | RF-002 | Inicio de sesión | No |
| POST | `/auth/logout` | RF-003 | Cerrar sesión | Sí |
| POST | `/auth/forgot-password` | RF-004 | Solicitar reset | No |
| POST | `/auth/reset-password` | RF-004 | Confirmar reset | Token |
| DELETE | `/auth/account` | RF-009 | Eliminar cuenta | Sí |

### POST `/auth/register`
```json
// Request
{ "email": "student@uni.edu", "password": "********", "full_name": "Ana García" }

// Response 201
{ "user": { "id": "uuid", "email": "..." }, "session": { "access_token": "...", "refresh_token": "..." } }
```

### POST `/auth/login`
```json
// Request
{ "email": "student@uni.edu", "password": "********" }

// Response 200
{ "user": { "id": "uuid", "email": "..." }, "session": { "access_token": "...", "refresh_token": "..." } }
```

---

## 3. Perfil — `/api/v1/profile`

| Método | Endpoint | RF | Descripción | Auth |
|--------|----------|-----|-------------|------|
| GET | `/profile` | RF-005 | Obtener perfil | Sí |
| PATCH | `/profile` | RF-005, RF-007, RF-008 | Actualizar perfil y preferencias | Sí |
| POST | `/profile/avatar` | RF-006 | Subir foto de perfil | Sí |
| DELETE | `/profile/avatar` | RF-006 | Eliminar foto | Sí |
| GET | `/profile/preferences` | RF-007 | Preferencias de aprendizaje | Sí |
| PATCH | `/profile/preferences` | RF-007 | Actualizar preferencias | Sí |

### PATCH `/profile`
```json
// Request
{
  "full_name": "Ana García",
  "language": "es",
  "timezone": "America/Costa_Rica",
  "learning_preferences": {
    "learning_style": "visual",
    "session_duration_minutes": 45,
    "techniques": ["pomodoro", "active_recall"]
  }
}
```

---

## 4. Carrera e institución — `/api/v1/career`

| Método | Endpoint | RF | Descripción | Auth |
|--------|----------|-----|-------------|------|
| GET | `/institutions` | RF-011 | Listar instituciones | Sí |
| POST | `/institutions` | RF-012 | Registrar institución custom | Sí |
| GET | `/careers` | RF-013 | Carreras por institución | Sí |
| POST | `/career/setup` | RF-013, RF-014 | Configurar carrera del estudiante | Sí |
| GET | `/career` | RF-013 | Carrera activa | Sí |
| POST | `/academic-periods` | RF-015 | Crear período | Sí |
| GET | `/academic-periods` | RF-015 | Listar períodos | Sí |
| PATCH | `/academic-periods/:id/activate` | RF-016 | Activar período | Sí |
| GET | `/academic-history` | RF-017 | Historial académico | Sí |
| POST | `/subjects/:id/status` | RF-018, RF-019 | Marcar aprobada/reprobada | Sí |
| GET | `/academic-progress` | RF-020 | Avance académico | Sí |

### GET `/academic-progress`
```json
// Response 200
{
  "total_subjects": 45,
  "approved": 12,
  "failed": 1,
  "in_progress": 5,
  "pending": 27,
  "completion_percentage": 26.67,
  "total_credits": 180,
  "earned_credits": 48
}
```

---

## 5. Plan de estudios — `/api/v1/curriculum`

| Método | Endpoint | RF | Descripción | Auth |
|--------|----------|-----|-------------|------|
| POST | `/curriculum/import` | RF-021, RF-022 | Upload PDF plan de estudios | Sí |
| GET | `/curriculum/imports` | RF-021 | Listar importaciones | Sí |
| GET | `/curriculum/imports/:id` | RF-029 | Detalle importación + datos extraídos | Sí |
| PATCH | `/curriculum/imports/:id` | RF-030 | Corregir datos extraídos | Sí |
| POST | `/curriculum/imports/:id/confirm` | RF-030 | Confirmar y crear materias | Sí |
| GET | `/curriculum/imports/:id/inconsistencies` | RF-031 | Inconsistencias detectadas | Sí |
| GET | `/subjects` | RF-024 | Materias del plan | Sí |
| GET | `/subjects/:id/prerequisites` | RF-027 | Prerrequisitos | Sí |

### POST `/curriculum/import`
```
Content-Type: multipart/form-data
Fields: file (PDF), career_id (UUID)
Max size: 10MB
```

---

## 6. Cursos y horario — `/api/v1/courses`, `/api/v1/schedules`

| Método | Endpoint | RF | Descripción | Auth |
|--------|----------|-----|-------------|------|
| GET | `/courses` | RF-032 | Listar cursos del período activo | Sí |
| POST | `/courses` | RF-032, RF-033 | Crear curso | Sí |
| GET | `/courses/:id` | RF-032 | Detalle curso | Sí |
| PATCH | `/courses/:id` | RF-032 | Actualizar curso | Sí |
| DELETE | `/courses/:id` | RF-032 | Eliminar curso | Sí |
| POST | `/professors` | RF-034 | Registrar profesor | Sí |
| GET | `/professors` | RF-034 | Listar profesores | Sí |
| POST | `/classrooms` | RF-036 | Registrar aula | Sí |
| GET | `/classrooms` | RF-036 | Listar aulas | Sí |
| GET | `/schedules` | RF-038 | Calendario semanal | Sí |
| POST | `/schedules` | RF-035, RF-037 | Crear horario | Sí |
| PATCH | `/schedules/:id` | RF-039 | Modificar horario | Sí |
| DELETE | `/schedules/:id` | RF-040 | Eliminar horario | Sí |
| GET | `/schedules/upcoming` | RF-041, RF-131 | Próxima clase | Sí |

### GET `/schedules?week=2026-08-11`
```json
// Response 200
{
  "week_start": "2026-08-11",
  "events": [
    {
      "id": "uuid",
      "course": { "id": "uuid", "name": "Cálculo I", "color": "#3B82F6" },
      "day_of_week": 1,
      "start_time": "18:00",
      "end_time": "20:00",
      "classroom": { "name": "Aula 301" },
      "modality": "in_person"
    }
  ]
}
```

---

## 7. Materiales — `/api/v1/materials`

| Método | Endpoint | RF | Descripción | Auth |
|--------|----------|-----|-------------|------|
| GET | `/materials` | RF-058 | Listar materiales (filtros) | Sí |
| POST | `/materials` | RF-051–055 | Upload material | Sí |
| GET | `/materials/:id` | RF-058 | Detalle material | Sí |
| PATCH | `/materials/:id` | RF-057 | Actualizar categoría/metadata | Sí |
| DELETE | `/materials/:id` | RF-059 | Eliminar material | Sí |
| GET | `/materials/search?q=` | RF-058 | Búsqueda full-text | Sí |
| GET | `/materials/:id/status` | — | Estado de procesamiento | Sí |

### POST `/materials`
```
Content-Type: multipart/form-data
Fields: file, course_id, subject_id?, category?, title?
Allowed types: pdf, doc, docx, ppt, pptx, jpg, png, mp4
Max size: 50MB (pdf/doc), 500MB (video — Fase 2)
```

---

## 8. Check-in — `/api/v1/checkins`

| Método | Endpoint | RF | Descripción | Auth |
|--------|----------|-----|-------------|------|
| GET | `/checkins` | RF-081 | Listar check-ins | Sí |
| GET | `/checkins/pending` | RF-082 | Check-ins pendientes | Sí |
| GET | `/checkins/:id` | RF-083 | Detalle check-in | Sí |
| PATCH | `/checkins/:id/topics` | RF-084–086 | Registrar/confirmar temas | Sí |
| PATCH | `/checkins/:id/comprehension` | RF-087, RF-088 | Nivel y dificultades | Sí |
| POST | `/checkins/:id/diagnostic` | RF-089 | Generar preguntas diagnósticas | Sí |
| POST | `/checkins/:id/diagnostic/submit` | RF-090 | Enviar respuestas | Sí |
| POST | `/checkins/:id/complete` | — | Finalizar check-in | Sí |

### POST `/checkins/:id/diagnostic/submit`
```json
// Request
{
  "responses": [
    { "question_id": "uuid", "answer": "La derivada de x² es 2x" }
  ]
}

// Response 200
{
  "analysis": {
    "comprehension_score": 72,
    "concepts_updated": [
      { "concept_id": "uuid", "name": "Derivadas", "mastery": 68, "change": -4 }
    ],
    "gaps_detected": [
      { "concept_id": "uuid", "name": "Regla de la cadena", "severity": "high" }
    ],
    "recommendations": [
      { "type": "practice", "concept": "Regla de la cadena", "estimated_minutes": 25 }
    ]
  }
}
```

---

## 9. Conocimiento y brechas — `/api/v1/knowledge`

| Método | Endpoint | RF | Descripción | Auth |
|--------|----------|-----|-------------|------|
| GET | `/concepts` | RF-091 | Conceptos del estudiante | Sí |
| GET | `/concepts/:id/mastery` | RF-091, RF-092 | Dominio de concepto | Sí |
| GET | `/knowledge-gaps` | RF-093 | Brechas activas | Sí |
| GET | `/knowledge-gaps/prioritized` | RF-095 | Brechas priorizadas | Sí |
| GET | `/knowledge-gaps/:id` | RF-094 | Detalle brecha | Sí |
| GET | `/mastery/evolution` | RF-098 | Evolución de dominio | Sí |

### GET `/knowledge-gaps/prioritized`
```json
// Response 200
{
  "gaps": [
    {
      "id": "uuid",
      "concept": { "id": "uuid", "name": "Integrales" },
      "course": { "id": "uuid", "name": "Cálculo I" },
      "mastery_percentage": 45,
      "severity": "critical",
      "priority_score": 92,
      "prerequisite_missing": false,
      "next_assessment_date": "2026-08-20"
    }
  ]
}
```

---

## 10. Tutor IA — `/api/v1/tutor`

| Método | Endpoint | RF | Descripción | Auth |
|--------|----------|-----|-------------|------|
| GET | `/tutor/conversations` | RF-099 | Listar conversaciones | Sí |
| POST | `/tutor/conversations` | RF-099 | Nueva conversación | Sí |
| GET | `/tutor/conversations/:id` | RF-099 | Mensajes de conversación | Sí |
| POST | `/tutor/chat` | RF-100–106 | Enviar mensaje al tutor | Sí |
| DELETE | `/tutor/conversations/:id` | — | Eliminar conversación | Sí |

### POST `/tutor/chat`
```json
// Request
{
  "conversation_id": "uuid",
  "message": "¿Puedes explicarme la regla de la cadena de otra forma?",
  "course_id": "uuid",
  "context": {
    "checkin_id": "uuid",
    "explain_differently": true
  }
}

// Response 200
{
  "message": {
    "id": "uuid",
    "role": "assistant",
    "content": "Claro, piensa en la regla de la cadena como...",
    "sources": [
      { "material_id": "uuid", "title": "Apuntes Clase 5", "chunk_preview": "..." }
    ]
  }
}
```

---

## 11. Prácticas — `/api/v1/practice`

| Método | Endpoint | RF | Descripción | Auth |
|--------|----------|-----|-------------|------|
| POST | `/practice/generate` | RF-116–120 | Generar práctica personalizada | Sí |
| GET | `/practice` | RF-116 | Listar prácticas | Sí |
| GET | `/practice/:id` | RF-116 | Detalle con ejercicios | Sí |
| POST | `/practice/:id/exercises/:exerciseId/submit` | RF-124 | Enviar respuesta | Sí |
| POST | `/practice/:id/complete` | RF-124 | Finalizar práctica | Sí |

### POST `/practice/generate`
```json
// Request
{
  "concept_id": "uuid",
  "course_id": "uuid",
  "source": "gap",
  "exercise_count": 5,
  "difficulty": "adaptive"
}

// Response 201
{
  "practice": {
    "id": "uuid",
    "exercises": [
      {
        "id": "uuid",
        "question_text": "Calcula la derivada de f(x) = (3x² + 1)⁵",
        "question_type": "open",
        "difficulty": 3
      }
    ]
  }
}
```

---

## 12. Progreso — `/api/v1/progress`

| Método | Endpoint | RF | Descripción | Auth |
|--------|----------|-----|-------------|------|
| GET | `/progress/overview` | RF-138 | Progreso general | Sí |
| GET | `/progress/by-subject` | RF-139 | Progreso por materia | Sí |
| GET | `/progress/by-concept` | RF-140 | Dominio por concepto | Sí |
| GET | `/progress/assessments` | RF-141 | Historial evaluaciones | Sí |
| GET | `/progress/evolution` | RF-142 | Evolución temporal | Sí |
| GET | `/progress/difficult-subjects` | RF-143 | Materias con dificultad | Sí |
| GET | `/progress/activities` | RF-144 | Actividades completadas | Sí |
| GET | `/progress/study-time` | RF-145 | Tiempo de estudio | Sí |

### GET `/progress/overview`
```json
// Response 200
{
  "academic_completion": 26.67,
  "overall_mastery": 68.5,
  "active_gaps": 7,
  "checkins_completed": 23,
  "practices_completed": 15,
  "study_hours_this_week": 12.5,
  "next_class": {
    "course": "Cálculo I",
    "starts_at": "2026-08-15T18:00:00Z"
  },
  "top_gaps": [
    { "concept": "Integrales", "mastery": 45, "severity": "critical" }
  ]
}
```

---

## 13. Notificaciones — `/api/v1/notifications`

| Método | Endpoint | RF | Descripción | Auth |
|--------|----------|-----|-------------|------|
| GET | `/notifications` | RF-146–150 | Listar notificaciones | Sí |
| PATCH | `/notifications/:id/read` | — | Marcar leída | Sí |
| GET | `/notifications/preferences` | RF-151 | Preferencias | Sí |
| PATCH | `/notifications/preferences` | RF-151 | Actualizar preferencias | Sí |

---

## 14. Endpoints Fase 2 (diseñados, no MVP)

### Videos — `/api/v1/classes`
| Método | Endpoint | RF |
|--------|----------|-----|
| POST | `/classes/:courseId/videos` | RF-061 |
| GET | `/classes/videos/:id/transcript` | RF-063 |
| GET | `/classes/videos/:id/topics` | RF-064 |
| GET | `/classes/videos/:id/concepts` | RF-065 |
| GET | `/classes/videos/:id/summary` | RF-066 |
| POST | `/classes/videos/:id/ask` | RF-069 |
| GET | `/classes/videos/:id/timestamp?concept=` | RF-068, RF-070 |

### Plan de aprendizaje — `/api/v1/learning-plans`
| Método | Endpoint | RF |
|--------|----------|-----|
| POST | `/learning-plans/generate` | RF-107 |
| GET | `/learning-plans/active` | RF-107 |
| PATCH | `/learning-plans/:id/activities/:activityId/complete` | RF-114 |

### Preparación pre-clase — `/api/v1/preparation`
| Método | Endpoint | RF |
|--------|----------|-----|
| GET | `/preparation/next-class` | RF-131–137 |
| POST | `/preparation/generate-practice` | RF-136 |

### Recursos — `/api/v1/resources`
| Método | Endpoint | RF |
|--------|----------|-----|
| GET | `/resources/search?concept_id=` | RF-125 |
| POST | `/resources/:id/save` | RF-130 |

---

## 15. Endpoints Fase 3 (integraciones)

| Método | Endpoint | RF |
|--------|----------|-----|
| POST | `/integrations/campus/connect` | RF-042 |
| DELETE | `/integrations/campus/disconnect` | RF-049 |
| POST | `/integrations/campus/import` | RF-046–048 |
| POST | `/integrations/teams/connect` | RF-073 |
| DELETE | `/integrations/teams/disconnect` | RF-080 |
| GET | `/integrations/teams/meetings` | RF-075 |

---

## 16. Endpoints Admin — `/api/v1/admin`

| Método | Endpoint | RF | Auth |
|--------|----------|-----|------|
| GET | `/admin/users` | RF-152 | Admin |
| PATCH | `/admin/users/:id/block` | RF-155 | Admin |
| GET | `/admin/audit-logs` | RF-154 | Admin |
| GET | `/admin/integrations` | RF-156 | Admin |
| PATCH | `/admin/storage-limits/:userId` | RF-157 | Admin |

---

## 17. Health y utilidades

| Método | Endpoint | Auth |
|--------|----------|------|
| GET | `/health` | No |
| GET | `/health/ready` | No |

---

## 18. Rate limiting (propuesta)

| Endpoint group | Límite |
|----------------|--------|
| Auth (login/register) | 10 req/min por IP |
| Upload | 20 req/hora por usuario |
| Tutor chat | 30 req/hora por usuario |
| Practice generate | 20 req/hora por usuario |
| General API | 100 req/min por usuario |

---

## 19. Referencias

- [SECURITY.md](./SECURITY.md) — Autorización y validación
- [DATABASE.md](./DATABASE.md) — Entidades
- [TRACEABILITY.md](./TRACEABILITY.md) — RF → Endpoint
