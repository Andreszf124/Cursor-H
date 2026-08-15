# Academic Ya! — Análisis del Sistema

> **Estado:** Documento de diseño inicial  
> **Fuente de verdad:** `Documentacion/🎓 ACADEMIC COPILOT.txt`  
> **Alcance:** 18 módulos · 148 RF · 59 HU

---

## 1. Resumen ejecutivo

Academic Ya! es una plataforma de acompañamiento académico personalizado para estudiantes universitarios. El sistema centraliza la gestión académica (carrera, cursos, horarios, materiales), captura el aprendizaje post-clase mediante check-ins, mantiene un motor de dominio de conceptos, detecta brechas de conocimiento y ofrece tutoría, prácticas y planes personalizados impulsados por IA.

El análisis confirma que el proyecto es **viable en fases**, con un MVP acotado que cubre el flujo principal: *registro → contexto académico → materiales → check-in → brechas → tutor/práctica → progreso*.

---

## 2. Inventario de módulos

| # | Módulo | RF | HU | Rol en el sistema |
|---|--------|----|----|-------------------|
| 1 | Usuarios y autenticación | 10 | 4 | Fundacional — identidad y aislamiento de datos |
| 2 | Institución, carrera y período | 10 | 4 | Contexto académico del estudiante |
| 3 | Plan de estudios (PDF) | 11 | 3 | Estructura curricular y prerrequisitos |
| 4 | Cursos y horario | 10 | 3 | Operación diaria y detección de fin de clase |
| 5 | Campus Virtual | 9 | 3 | Integración externa (post-MVP) |
| 6 | Materiales académicos | 10 | 3 | Repositorio documental + contexto IA |
| 7 | Análisis de clases y videos | 12 | 4 | Pipeline de video/transcripción (fase 2) |
| 8 | Microsoft Teams | 8 | 3 | Integración externa (fase 3) |
| 9 | Check-in después de clase | 10 | 4 | **Núcleo pedagógico** del producto |
| 10 | Evaluación y brechas | 8 | 3 | Motor de conocimiento |
| 11 | Tutor académico IA | 8 | 3 | Asistente contextual con RAG |
| 12 | Plan personalizado | 9 | 3 | Orquestación de estudio (MVP parcial) |
| 13 | Generación de prácticas | 9 | 4 | Refuerzo adaptativo |
| 14 | Recursos educativos | 6 | 3 | Recomendaciones externas (post-MVP) |
| 15 | Preparación próxima clase | 7 | 3 | Agregador de recomendaciones (post-MVP) |
| 16 | Progreso y estadísticas | 8 | 3 | Visualización y métricas |
| 17 | Notificaciones | 6 | 3 | Recordatorios y check-in push |
| 18 | Administración y seguridad | 7 | 3 | Operaciones, auditoría, límites |

---

## 3. Entidades identificadas

### 3.1 Identidad y perfil
- **User** (Supabase Auth — no duplicar credenciales)
- **Profile** — datos personales, foto, idioma, preferencias de aprendizaje
- **LearningPreferences** — estilo, horas disponibles, técnicas preferidas

### 3.2 Contexto académico
- **Institution** — catálogo + instituciones custom del estudiante
- **Career** — carrera vinculada a institución
- **AcademicPeriod** — semestre/trimestre activo
- **Subject** — materia del plan de estudios
- **Prerequisite** — relación entre materias
- **StudentSubjectStatus** — aprobada/reprobada/en curso
- **CurriculumImport** — job de importación PDF con estado

### 3.3 Operación académica
- **Course** — instancia de materia en un período
- **Professor**
- **Schedule** — bloques horarios
- **Classroom**
- **ClassSession** — ocurrencia calculada de una clase (para check-in)

### 3.4 Materiales y archivos
- **Material** — entidad polimórfica padre
- **Document** / **Presentation** / **Image** / **Video** — subtipos o metadata
- **MaterialCategory**
- **FileMetadata** — tamaño, MIME, estado de procesamiento
- **ContentChunk** — fragmentos para RAG
- **Embedding** — vectores indexados por estudiante/curso

### 3.5 Procesamiento de contenido
- **Transcript** — transcripción de video/audio
- **TranscriptSegment** — segmentos con timestamps
- **ExtractedConcept** — conceptos detectados en contenido
- **ProcessingJob** — cola de trabajos async

### 3.6 Conocimiento y evaluación
- **Concept** — catálogo de conceptos por materia/curso
- **ConceptMastery** — dominio % por estudiante
- **MasteryEvidence** — origen del dato (check-in, práctica, tutor)
- **KnowledgeGap** — brecha detectada con prioridad
- **Assessment** — evaluación diagnóstica
- **AssessmentResponse**

### 3.7 Check-in y aprendizaje activo
- **Checkin** — sesión post-clase
- **CheckinTopic** — temas vistos (confirmados o sugeridos)
- **CheckinComprehension** — nivel y dificultades
- **DiagnosticQuestion** / **DiagnosticAnswer**

### 3.8 IA y tutoría
- **TutorConversation** — hilo de chat
- **TutorMessage** — mensajes con contexto RAG
- **Practice** — sesión de práctica generada
- **Exercise** — ejercicio individual
- **ExerciseAttempt** — respuesta y retroalimentación

### 3.9 Planificación
- **LearningPlan** — plan personalizado
- **LearningActivity** — actividad con duración estimada
- **ClassPreparation** — recomendación pre-clase

### 3.10 Recursos e integraciones
- **EducationalResource** — recurso externo recomendado
- **SavedResource**
- **Integration** — Campus Virtual, Teams, etc.
- **IntegrationCredential** — tokens OAuth (nunca contraseñas de campus)

### 3.11 Sistema
- **Notification** — notificaciones in-app/push/email
- **NotificationPreference**
- **AuditLog** — acciones sensibles
- **StorageQuota** — límites por usuario

---

## 4. Mapa de dependencias entre módulos

```
                    ┌─────────────┐
                    │  M1: Auth   │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────────┐
        │ M2:Carrera│ │ M18:Admin│ │ M17:Notif.  │
        └─────┬────┘ └──────────┘ └──────┬───────┘
              │                          │
              ▼                          │
        ┌──────────┐                     │
        │ M3: PDF  │                     │
        └─────┬────┘                     │
              │                          │
              ▼                          │
        ┌──────────┐                     │
        │ M4:Cursos│◄────────────────────┘
        └─────┬────┘
              │
     ┌────────┼────────┐
     ▼        ▼        ▼
┌────────┐ ┌────────┐ ┌────────────┐
│M6:Mat. │ │M5:Camp.│ │M8: Teams   │  ← post-MVP
└───┬────┘ └────────┘ └────────────┘
    │
    ├──────────────────┐
    ▼                  ▼
┌────────┐        ┌──────────┐
│M7:Video│        │M9:Check-in│  ← núcleo
└────────┘        └─────┬────┘
                        │
           ┌────────────┼────────────┐
           ▼            ▼            ▼
     ┌──────────┐ ┌──────────┐ ┌──────────┐
     │M10:Brechas│ │M11:Tutor│ │M13:Práct.│
     └─────┬────┘ └────┬─────┘ └────┬─────┘
           │           │            │
           └───────────┼────────────┘
                       ▼
              ┌────────────────┐
              │ M12: Plan      │
              │ M15: Próx.clase│
              │ M16: Progreso  │
              │ M14: Recursos  │
              └────────────────┘
```

### Dependencias críticas (orden de implementación)

| Orden | Módulo | Depende de | Bloquea a |
|-------|--------|------------|-----------|
| 1 | Auth (1) | — | Todos |
| 2 | Carrera (2) | Auth | PDF, Cursos |
| 3 | PDF (3) | Carrera | Cursos (materias) |
| 4 | Cursos/Horario (4) | Carrera, PDF | Check-in, Materiales |
| 5 | Materiales (6) | Cursos | Tutor, RAG, Video |
| 6 | Notificaciones (17)* | Cursos, Auth | Check-in |
| 7 | Check-in (9) | Cursos, Notif. | Brechas, Prácticas |
| 8 | Brechas (10) | Check-in, Conceptos | Tutor, Prácticas, Progreso |
| 9 | Tutor IA (11) | Materiales, Brechas | — |
| 10 | Prácticas (13) | Brechas, Check-in | Progreso |
| 11 | Progreso (16) | Brechas, Prácticas | — |

\* Notificaciones: slice mínimo en MVP (check-in + recordatorio de clase).

---

## 5. Componentes de IA identificados

| Componente | RF relacionados | Fase |
|------------|-----------------|------|
| Extracción PDF plan de estudios | RF-023–031 | MVP |
| Extracción texto materiales | RF-060, pipeline archivos | MVP |
| Chunking + Embeddings (RAG) | RF-101, arquitectura RAG | MVP |
| Sugerencia de temas en check-in | RF-085 | MVP |
| Preguntas diagnósticas | RF-089–090 | MVP |
| Cálculo dominio/brechas | RF-091–098 | MVP |
| Tutor conversacional | RF-099–106 | MVP |
| Generación de prácticas | RF-116–124 | MVP |
| Transcripción video | RF-062–063 | Fase 2 |
| Detección conceptos/temas video | RF-064–065, 071–072 | Fase 2 |
| Resumen y keywords | RF-066–067 | Fase 2 |
| Plan personalizado completo | RF-107–115 | Fase 2 |
| Recursos educativos | RF-125–129 | Fase 2 |
| Preparación pre-clase | RF-131–137 | Fase 2 |

---

## 6. Integraciones identificadas

| Integración | RF | Fase | Riesgo |
|-------------|-----|------|--------|
| Supabase Auth | RF-001–004 | MVP | Bajo |
| Supabase Storage | RF-051–055 | MVP | Bajo |
| Supabase PostgreSQL + RLS | RF-010 | MVP | Medio |
| Proveedor IA (abstracto) | RF-099+ | MVP | Medio |
| Campus Virtual + extensión | RF-042–050 | Fase 3 | Alto |
| Microsoft Teams / Graph | RF-073–080 | Fase 3 | Alto |
| Push notifications (web) | RF-146–151 | MVP parcial | Medio |
| Email (recuperación contraseña) | RF-004 | MVP (Supabase) | Bajo |

---

## 7. Riesgos identificados y respuesta anti-vulnerabilidades

> **Regla:** Ningún módulo pasa a "completado" sin controles de seguridad verificados.  
> Detalle operativo: [SECURITY.md §19](./SECURITY.md#19-plan-de-respuesta-a-riesgos-críticos)

### 7.1 Seguridad y privacidad (CRÍTICO)

| Riesgo | Vulnerabilidad OWASP | Impacto | Controles obligatorios |
|--------|---------------------|---------|------------------------|
| Fuga de datos entre estudiantes | A01 Broken Access Control (IDOR) | Crítico | RLS + ownership en service + **nunca confiar en `student_id` del body**; usar `auth.uid()` del token; responder **404** (no 403) en recursos ajenos para evitar enumeración; tests IDOR en CI |
| Exfiltración via RAG | A01 + LLM prompt injection | Crítico | Filtro `student_id` obligatorio en vector search (fail-closed); delimitadores `<context>`; system prompt inmutable; **no enviar chunks de otros usuarios aunque el LLM lo pida**; tests de aislamiento RAG |
| Archivos maliciosos | A08 Software/Data Integrity | Alto | Magic bytes (no solo extensión); renombrar archivos server-side (UUID); sandbox de extracción PDF; límite páginas PDF; rechazar JS/embebidos activos; antivirus opcional en Fase 2 |
| Prompt injection en tutor | LLM01 Prompt Injection | Alto | Input max 2000 chars; strip instrucciones embebidas; output filter; rate limit chat; **no ejecutar código** sugerido por el LLM |
| Robo de sesión / XSS | A03 Injection (XSS), A07 Auth | Alto | React sin `dangerouslySetInnerHTML`; CSP headers; tokens solo en memoria (no localStorage); HttpOnly si se usan cookies; refresh token rotation |
| Exposición service role key | A02 Security Misconfiguration | Crítico | `SUPABASE_SERVICE_ROLE_KEY` **solo backend**; nunca en frontend ni logs; cliente Supabase con anon key + JWT del usuario para queries RLS |
| Credential stuffing | A07 Identification Failures | Alto | Rate limit login (10/min IP); captcha tras 5 fallos (Fase 2); Supabase Auth lockout; audit de intentos fallidos |

### 7.2 Técnicos (con vector de abuso)

| Riesgo | Vulnerabilidad potencial | Impacto | Controles |
|--------|-------------------------|---------|-----------|
| Extracción PDF imprecisa | — (calidad, no seguridad) | Alto | UI corrección manual (RF-030); límite 500 páginas; timeout de job 5 min |
| Procesamiento video costoso | A04 Insecure Design (DoS económico) | Alto | Colas async; límite 2 videos/día MVP; cuota storage (RF-157); job timeout |
| Latencia tutor RAG | DoS por spam de requests | Medio | Rate limit 30 req/h; timeout 30s; circuit breaker si AI provider falla |
| Complejidad motor dominio | Manipulación de mastery | Medio | Mastery solo vía evidencias validadas server-side; no PATCH directo a `concept_mastery` |

### 7.3 Producto y operación

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Scope creep (148 RF) | Alto | MVP estricto, fases documentadas |
| Dependencia proveedor IA | Medio | Abstracción `AIProvider`; no loguear prompts completos con PII |
| Variabilidad planes de estudio | Medio | Parser + corrección humana |
| Permisos Microsoft/Teams | Alto | Postergar módulo 8; OAuth PKCE; scopes mínimos |

### 7.4 Compliance

| Riesgo | Vulnerabilidad | Impacto | Controles |
|--------|---------------|---------|-----------|
| Eliminación incompleta de datos | A09 Data Integrity Failures | Alto | Purge job verificable; eliminar Storage + embeddings + Auth user; confirmación con password |
| Auditoría insuficiente | A09 Logging Failures | Medio | `audit_logs` desde MVP; login fallido, upload, delete, acceso admin |
| Filtrado de PII en logs | A09 Logging Failures | Alto | Logger con redacción automática (email, tokens, contenido tutor) |

### 7.5 Reglas innegociables (implementación)

```
1. student_id SIEMPRE viene del JWT verificado — NUNCA del request body/query
2. Toda query a DB con datos de estudiante incluye filtro por owner
3. Service role key solo en backend, nunca expuesta al cliente
4. Archivos: validar magic bytes + generar nombre UUID server-side
5. Errores al cliente: genéricos. Detalle solo en logs internos redactados
6. Tests IDOR + RLS en CI — build falla si no pasan
7. npm audit en CI — bloquear critical/high sin justificación
8. CORS: lista explícita, nunca wildcard con credentials
```

---

## 8. Requerimientos no funcionales inferidos

Aunque no están numerados en la fuente, se derivan del contexto y las reglas del proyecto:

| Categoría | Requisito |
|-----------|-----------|
| Seguridad | Aislamiento multi-tenant por estudiante |
| Seguridad | Validación Zod en frontend y backend |
| Rendimiento | Procesamiento pesado async (jobs/colas) |
| Escalabilidad | Frontend/backend separados |
| Disponibilidad | Deploy Vercel + Node.js service |
| UX | Responsive, accesible, moderna |
| Trazabilidad | RF → HU → código → test |
| Mantenibilidad | Feature-based (FE) + modular por dominio (BE) |
| i18n | Español inicial; RF-008 prepara multi-idioma |
| Testing | Tests por módulo antes de marcar HU completa |

---

## 9. Decisiones de alcance para revisión

1. **Módulo 12 (Plan personalizado)** — No está en MVP explícito del prompt maestro, pero RF-107–115 conecta brechas con acciones. Se incluye **slice mínimo** en Fase 1B (recomendaciones simples post check-in) y plan completo en Fase 2.

2. **Módulo 17 (Notificaciones)** — Slice mínimo en MVP: recordatorio fin de clase + check-in pendiente. Configuración completa en Fase 2.

3. **Módulo 18 (Admin)** — Solo `audit_logs` y eliminación de datos en MVP. Panel admin completo en Fase 3.

4. **Módulo 7 (Videos)** — Upload básico en MVP (almacenamiento); procesamiento completo en Fase 2.

---

## 10. Métricas de éxito del MVP

- Estudiante puede registrarse, configurar carrera y subir plan PDF
- Estudiante puede crear cursos con horario y ver calendario semanal
- Estudiante puede subir materiales PDF asociados a curso
- Sistema detecta fin de clase y envía check-in
- Check-in genera diagnóstico y actualiza dominio/brechas
- Tutor responde usando materiales del estudiante (RAG)
- Sistema genera práctica personalizada
- Dashboard muestra progreso, brechas y próxima clase
- **0 accesos cruzados** entre estudiantes verificado por tests de seguridad
- **CI bloquea** merge si fallan tests IDOR, RLS o `npm audit` critical/high

---

## 11. Referencias

- Requerimientos completos: `Documentacion/🎓 ACADEMIC COPILOT.txt`
- Arquitectura: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Base de datos: [DATABASE.md](./DATABASE.md)
- API: [API.md](./API.md)
- Seguridad: [SECURITY.md](./SECURITY.md)
- IA: [AI_ARCHITECTURE.md](./AI_ARCHITECTURE.md)
- Plan de desarrollo: [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md)
- Trazabilidad: [TRACEABILITY.md](./TRACEABILITY.md)
