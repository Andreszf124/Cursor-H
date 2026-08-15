# Academic Copilot — Modelo de Datos

> **Estado:** Diseño propuesto  
> **Motor:** PostgreSQL (Supabase)  
> **Extensiones:** `pgvector`, `uuid-ossp`

---

## 1. Convenciones

| Convención | Valor |
|------------|-------|
| PK | `id UUID DEFAULT gen_random_uuid()` |
| Timestamps | `created_at`, `updated_at TIMESTAMPTZ` |
| Soft delete | `deleted_at TIMESTAMPTZ NULL` donde aplique |
| Owner | `student_id UUID REFERENCES auth.users(id)` |
| Naming | snake_case, plural para tablas |
| RLS | Habilitado en **todas** las tablas con datos de estudiante |

---

## 2. Diagrama entidad-relación (alto nivel)

```
auth.users ──┬── profiles
             ├── student_careers ── careers ── institutions
             ├── academic_periods
             ├── student_subjects ── subjects ── prerequisites
             ├── courses ── professors
             │       ├── schedules ── classrooms
             │       └── materials ── content_chunks ── embeddings
             ├── curriculum_imports
             ├── checkins ── checkin_topics ── diagnostic_answers
             ├── concepts ── concept_mastery ── mastery_evidence
             ├── knowledge_gaps
             ├── tutor_conversations ── tutor_messages
             ├── practices ── exercises ── exercise_attempts
             ├── learning_plans ── learning_activities
             ├── notifications ── notification_preferences
             ├── integrations
             └── audit_logs
```

---

## 3. Tablas por dominio

### 3.1 Identidad y perfil

#### `profiles`
Extiende `auth.users` con datos de aplicación.

| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | = auth.users.id |
| full_name | TEXT | RF-005 |
| avatar_url | TEXT | RF-006 — Supabase Storage path |
| language | TEXT DEFAULT 'es' | RF-008 — ISO 639-1 |
| timezone | TEXT DEFAULT 'America/Costa_Rica' | Para horarios |
| onboarding_completed | BOOLEAN DEFAULT false | |
| deleted_at | TIMESTAMPTZ | RF-009 soft delete |

#### `learning_preferences`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| student_id | UUID FK → profiles | UNIQUE |
| preferred_study_hours | JSONB | Horas disponibles por día |
| learning_style | TEXT | visual, auditory, kinesthetic, mixed |
| session_duration_minutes | INT DEFAULT 45 | |
| difficulty_preference | TEXT | adaptive, easy, challenging |
| techniques | TEXT[] | RF-007 |

---

### 3.2 Institución y carrera

#### `institutions`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| name | TEXT NOT NULL | |
| country | TEXT | |
| is_verified | BOOLEAN DEFAULT false | Catálogo oficial |
| created_by | UUID FK NULL | RF-012 — institución custom |

#### `careers`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| institution_id | UUID FK | |
| name | TEXT NOT NULL | RF-013 |
| degree_level | TEXT | RF-014 — licenciatura, maestría, etc. |
| total_credits | INT | Calculado del plan |

#### `student_careers`
Relación estudiante ↔ carrera activa.

| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| student_id | UUID FK | |
| career_id | UUID FK | |
| is_active | BOOLEAN DEFAULT true | |
| started_at | DATE | |
| expected_graduation | DATE | |

#### `academic_periods`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| student_id | UUID FK | |
| name | TEXT | "2026-I", "Primer Semestre 2026" |
| start_date | DATE | RF-015 |
| end_date | DATE | |
| is_active | BOOLEAN DEFAULT false | RF-016 — solo uno activo |

#### `subjects`
Materias del plan de estudios.

| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| career_id | UUID FK | |
| student_id | UUID FK | Owner del plan importado |
| code | TEXT | RF-025 — "MAT-101" |
| name | TEXT NOT NULL | RF-024 |
| credits | INT | RF-026 |
| is_elective | BOOLEAN DEFAULT false | RF-028 |
| semester | INT | Posición en plan |
| source | TEXT | manual, pdf_import |

#### `prerequisites`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| subject_id | UUID FK → subjects | Materia que requiere |
| prerequisite_subject_id | UUID FK → subjects | Prerrequisito |
| UNIQUE | (subject_id, prerequisite_subject_id) | |

#### `student_subject_status`
Historial académico del estudiante.

| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| student_id | UUID FK | |
| subject_id | UUID FK | |
| status | TEXT | approved, failed, in_progress, pending |
| grade | TEXT NULL | |
| completed_at | DATE NULL | RF-017, RF-018, RF-019 |
| academic_period_id | UUID FK NULL | |

---

### 3.3 Plan de estudios (PDF)

#### `curriculum_imports`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| student_id | UUID FK | |
| career_id | UUID FK | |
| file_path | TEXT | Supabase Storage |
| status | TEXT | pending, processing, review, completed, failed |
| extracted_data | JSONB | Resultado bruto de extracción |
| inconsistencies | JSONB | RF-031 |
| error_message | TEXT NULL | |
| reviewed_at | TIMESTAMPTZ NULL | RF-030 |

---

### 3.4 Cursos y horario

#### `professors`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| student_id | UUID FK | Profesores registrados por el estudiante |
| name | TEXT NOT NULL | RF-034 |
| email | TEXT NULL | |

#### `courses`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| student_id | UUID FK | |
| subject_id | UUID FK NULL | RF-033 |
| academic_period_id | UUID FK | |
| professor_id | UUID FK NULL | |
| name | TEXT NOT NULL | RF-032 |
| modality | TEXT | in_person, virtual, hybrid — RF-037 |
| color | TEXT | Para calendario UI |

#### `classrooms`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| student_id | UUID FK | |
| name | TEXT NOT NULL | RF-036 |
| location | TEXT NULL | |
| virtual_url | TEXT NULL | |

#### `schedules`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| course_id | UUID FK | |
| student_id | UUID FK | |
| classroom_id | UUID FK NULL | |
| day_of_week | INT | 0=Dom, 1=Lun...6=Sáb |
| start_time | TIME NOT NULL | RF-035 |
| end_time | TIME NOT NULL | RF-041 — detectar fin |
| recurrence | TEXT DEFAULT 'weekly' | |
| valid_from | DATE | |
| valid_until | DATE NULL | |

---

### 3.5 Materiales

#### `materials`
Entidad padre polimórfica.

| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| student_id | UUID FK | |
| course_id | UUID FK NULL | RF-056 |
| subject_id | UUID FK NULL | |
| title | TEXT NOT NULL | |
| type | TEXT | pdf, document, presentation, image, video |
| category | TEXT NULL | RF-057 |
| file_path | TEXT | Supabase Storage path |
| file_name | TEXT | |
| mime_type | TEXT | |
| file_size_bytes | BIGINT | |
| processing_status | TEXT | pending, processing, completed, failed |
| metadata | JSONB | RF-060 — keywords, page count, etc. |
| deleted_at | TIMESTAMPTZ | RF-059 soft delete |

#### `content_chunks`
Fragmentos para RAG.

| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| material_id | UUID FK | |
| student_id | UUID FK | Denormalizado para RLS |
| course_id | UUID FK NULL | Filtro RAG |
| subject_id | UUID FK NULL | Filtro RAG |
| chunk_index | INT | Orden en documento |
| content | TEXT NOT NULL | |
| token_count | INT | |
| metadata | JSONB | page, section, timestamp |

#### `embeddings`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| chunk_id | UUID FK → content_chunks | |
| student_id | UUID FK | |
| embedding | vector(1536) | Dimensión según provider |
| model | TEXT | Modelo usado |

**Índice:** `CREATE INDEX ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);`

---

### 3.6 Videos y transcripciones (Fase 2)

#### `transcripts`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| material_id | UUID FK | material.type = 'video' |
| student_id | UUID FK | |
| full_text | TEXT | RF-063 |
| language | TEXT | |
| status | TEXT | processing, completed, failed |

#### `transcript_segments`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| transcript_id | UUID FK | |
| start_seconds | DECIMAL | RF-068, RF-070 |
| end_seconds | DECIMAL | |
| text | TEXT | |
| speaker | TEXT NULL | |

#### `extracted_concepts`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| source_type | TEXT | material, transcript, checkin |
| source_id | UUID | |
| concept_id | UUID FK → concepts | |
| confidence | DECIMAL | |
| timestamp_seconds | DECIMAL NULL | |

---

### 3.7 Conceptos y dominio

#### `concepts`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| student_id | UUID FK | Conceptos del contexto del estudiante |
| subject_id | UUID FK NULL | |
| course_id | UUID FK NULL | |
| name | TEXT NOT NULL | |
| description | TEXT NULL | |
| parent_concept_id | UUID FK NULL | Jerarquía |

#### `concept_mastery`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| student_id | UUID FK | |
| concept_id | UUID FK | |
| mastery_percentage | DECIMAL(5,2) | RF-091, RF-092 — 0.00 a 100.00 |
| last_updated_at | TIMESTAMPTZ | RF-098 |
| UNIQUE | (student_id, concept_id) | |

#### `mastery_evidence`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| concept_mastery_id | UUID FK | |
| source_type | TEXT | checkin, practice, assessment, tutor, error |
| source_id | UUID | |
| impact | DECIMAL | +/- cambio en dominio |
| recorded_at | TIMESTAMPTZ | |

#### `knowledge_gaps`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| student_id | UUID FK | |
| concept_id | UUID FK | |
| course_id | UUID FK NULL | |
| severity | TEXT | critical, high, medium, low — RF-094 |
| priority_score | DECIMAL | RF-095 |
| prerequisite_missing | BOOLEAN DEFAULT false | RF-096 |
| next_assessment_date | DATE NULL | RF-097 |
| status | TEXT | active, improving, resolved |
| detected_at | TIMESTAMPTZ | |
| resolved_at | TIMESTAMPTZ NULL | |

---

### 3.8 Check-in

#### `checkins`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| student_id | UUID FK | |
| course_id | UUID FK | RF-083 |
| schedule_id | UUID FK NULL | |
| class_date | DATE | |
| status | TEXT | pending, in_progress, completed, skipped |
| comprehension_level | INT NULL | 1-5 — RF-087 |
| difficulties | TEXT NULL | RF-088 |
| notification_sent_at | TIMESTAMPTZ NULL | RF-082 |
| completed_at | TIMESTAMPTZ NULL | |

#### `checkin_topics`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| checkin_id | UUID FK | |
| topic | TEXT NOT NULL | RF-084 |
| source | TEXT | student, ai_suggested — RF-085, RF-086 |
| confirmed | BOOLEAN DEFAULT false | |
| concept_id | UUID FK NULL | |

#### `assessments`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| student_id | UUID FK | |
| checkin_id | UUID FK NULL | |
| type | TEXT | diagnostic, practice, pre_class |
| status | TEXT | pending, completed |

#### `assessment_questions`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| assessment_id | UUID FK | |
| concept_id | UUID FK NULL | |
| question_text | TEXT | RF-089 |
| question_type | TEXT | multiple_choice, open, true_false |
| options | JSONB NULL | |
| correct_answer | TEXT | |
| explanation | TEXT | |

#### `assessment_responses`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| assessment_id | UUID FK | |
| question_id | UUID FK | |
| student_answer | TEXT | RF-090 |
| is_correct | BOOLEAN | |
| ai_feedback | TEXT NULL | |

---

### 3.9 Tutor IA

#### `tutor_conversations`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| student_id | UUID FK | |
| course_id | UUID FK NULL | RF-106 |
| subject_id | UUID FK NULL | |
| title | TEXT NULL | Auto-generado |
| created_at | TIMESTAMPTZ | |

#### `tutor_messages`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| conversation_id | UUID FK | |
| role | TEXT | user, assistant, system |
| content | TEXT | |
| sources | JSONB NULL | Chunks RAG utilizados |
| token_count | INT NULL | |

---

### 3.10 Prácticas

#### `practices`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| student_id | UUID FK | |
| course_id | UUID FK NULL | |
| concept_id | UUID FK NULL | RF-117 |
| source_type | TEXT | gap, checkin, pre_class, manual |
| source_id | UUID NULL | |
| difficulty_level | INT | RF-120 — 1-5 |
| status | TEXT | pending, in_progress, completed |
| score | DECIMAL NULL | RF-124 |
| completed_at | TIMESTAMPTZ NULL | |

#### `exercises`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| practice_id | UUID FK | |
| concept_id | UUID FK NULL | |
| question_text | TEXT | RF-116 |
| question_type | TEXT | |
| options | JSONB NULL | |
| correct_answer | TEXT | RF-121 |
| explanation | TEXT | RF-122 |
| difficulty | INT | |
| content_hash | TEXT | RF-123 — evitar duplicados |

#### `exercise_attempts`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| exercise_id | UUID FK | |
| student_id | UUID FK | |
| answer | TEXT | |
| is_correct | BOOLEAN | |
| feedback | TEXT | RF-122 |
| attempted_at | TIMESTAMPTZ | |

---

### 3.11 Plan de aprendizaje (Fase 2)

#### `learning_plans`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| student_id | UUID FK | |
| course_id | UUID FK NULL | |
| title | TEXT | RF-107 |
| status | TEXT | active, completed, archived |
| available_minutes | INT | RF-109 |
| next_class_at | TIMESTAMPTZ NULL | RF-110 |
| generated_at | TIMESTAMPTZ | |

#### `learning_activities`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| plan_id | UUID FK | |
| concept_id | UUID FK NULL | |
| title | TEXT | RF-112 |
| activity_type | TEXT | review, practice, read, watch |
| estimated_minutes | INT | RF-113 |
| technique | TEXT NULL | RF-111 |
| status | TEXT | pending, completed, skipped — RF-114 |
| completed_at | TIMESTAMPTZ NULL | |
| sort_order | INT | |

---

### 3.12 Recursos educativos (Fase 2)

#### `educational_resources`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| concept_id | UUID FK | |
| title | TEXT | RF-125 |
| url | TEXT | |
| source_type | TEXT | RF-126 — academic, video, article, book |
| reliability_score | DECIMAL | RF-127 |
| origin | TEXT | RF-128 |
| recommendation_reason | TEXT | RF-129 |

#### `saved_resources`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| student_id | UUID FK | |
| resource_id | UUID FK | RF-130 |
| saved_at | TIMESTAMPTZ | |

---

### 3.13 Notificaciones

#### `notifications`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| student_id | UUID FK | |
| type | TEXT | class_reminder, checkin, activity, assessment, review |
| title | TEXT | |
| body | TEXT | |
| data | JSONB | Referencia a entidad relacionada |
| read_at | TIMESTAMPTZ NULL | |
| sent_at | TIMESTAMPTZ | RF-146–150 |

#### `notification_preferences`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| student_id | UUID FK UNIQUE | |
| checkin_enabled | BOOLEAN DEFAULT true | RF-151 |
| class_reminders | BOOLEAN DEFAULT true | |
| study_reminders | BOOLEAN DEFAULT true | |
| assessment_reminders | BOOLEAN DEFAULT true | |
| channels | JSONB | in_app, email, push |

---

### 3.14 Integraciones (Fase 3)

#### `integrations`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| student_id | UUID FK | |
| provider | TEXT | campus_virtual, teams, moodle, canvas |
| status | TEXT | connected, disconnected, error |
| config | JSONB | Metadatos no sensibles |
| connected_at | TIMESTAMPTZ | |
| disconnected_at | TIMESTAMPTZ NULL | RF-049, RF-080 |

#### `integration_tokens`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| integration_id | UUID FK | |
| access_token_encrypted | TEXT | Encriptado at-rest |
| refresh_token_encrypted | TEXT NULL | |
| expires_at | TIMESTAMPTZ | |
| **NUNCA** | password campus | RF-050 |

---

### 3.15 Sistema

#### `processing_jobs`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| student_id | UUID FK | |
| job_type | TEXT | pdf_extract, embedding, transcription, video_analysis |
| entity_type | TEXT | material, curriculum_import |
| entity_id | UUID | |
| status | TEXT | pending, processing, completed, failed |
| attempts | INT DEFAULT 0 | |
| error_message | TEXT NULL | |
| started_at | TIMESTAMPTZ NULL | |
| completed_at | TIMESTAMPTZ NULL | |

#### `audit_logs`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| actor_id | UUID FK NULL | |
| action | TEXT | RF-154 |
| entity_type | TEXT | |
| entity_id | UUID NULL | |
| metadata | JSONB | |
| ip_address | INET NULL | |
| created_at | TIMESTAMPTZ | |

#### `storage_quotas`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| student_id | UUID FK UNIQUE | |
| used_bytes | BIGINT DEFAULT 0 | RF-157 |
| limit_bytes | BIGINT DEFAULT 5368709120 | 5 GB default |

---

## 4. Row Level Security (RLS)

### Política base (aplicar a todas las tablas con `student_id`)

```sql
-- Ejemplo para courses
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students_own_courses" ON courses
  FOR ALL
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());
```

### Reglas especiales

| Tabla | Política |
|-------|----------|
| `institutions` (verified) | SELECT público; INSERT con created_by = auth.uid() |
| `embeddings` | SELECT/INSERT solo si chunk.student_id = auth.uid() |
| `audit_logs` | INSERT via service role; SELECT solo admin |
| `profiles` | CRUD solo auth.uid() = id |

---

## 5. Índices recomendados

```sql
-- Búsqueda de materiales
CREATE INDEX idx_materials_student_course ON materials(student_id, course_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_materials_search ON materials USING gin(to_tsvector('spanish', title));

-- Horarios y check-in
CREATE INDEX idx_schedules_course ON schedules(course_id, day_of_week);
CREATE INDEX idx_checkins_pending ON checkins(student_id, status) WHERE status = 'pending';

-- Dominio y brechas
CREATE INDEX idx_mastery_student ON concept_mastery(student_id);
CREATE INDEX idx_gaps_active ON knowledge_gaps(student_id, status) WHERE status = 'active';

-- RAG
CREATE INDEX idx_chunks_student_course ON content_chunks(student_id, course_id);
CREATE INDEX idx_embeddings_student ON embeddings(student_id);

-- Jobs
CREATE INDEX idx_jobs_pending ON processing_jobs(status, created_at) WHERE status = 'pending';
```

---

## 6. Triggers y funciones

| Trigger | Función |
|---------|---------|
| `updated_at` | Auto-actualizar `updated_at` en UPDATE |
| `storage_quota_check` | Validar límite antes de upload |
| `single_active_period` | Solo un `academic_periods.is_active = true` por estudiante |
| `cascade_soft_delete` | Propagar soft delete a materiales/checkins |

---

## 7. Migraciones — Estrategia

```
database/
├── migrations/
│   ├── 001_extensions.sql          # pgvector, uuid
│   ├── 002_profiles.sql
│   ├── 003_institutions_careers.sql
│   ├── 004_subjects_prerequisites.sql
│   ├── 005_courses_schedules.sql
│   ├── 006_materials_chunks.sql
│   ├── 007_embeddings.sql
│   ├── 008_concepts_mastery.sql
│   ├── 009_checkins_assessments.sql
│   ├── 010_tutor_practices.sql
│   ├── 011_notifications.sql
│   ├── 012_audit_storage.sql
│   └── 013_rls_policies.sql
├── seeds/
│   └── institutions_catalog.sql
└── README.md
```

Cada migración es **idempotente** y se aplica en orden durante el desarrollo incremental por módulo.

---

## 8. Referencias

- [SECURITY.md](./SECURITY.md) — Políticas RLS detalladas
- [ARCHITECTURE.md](./ARCHITECTURE.md) — Contexto arquitectónico
- [API.md](./API.md) — Endpoints que consumen estas entidades
