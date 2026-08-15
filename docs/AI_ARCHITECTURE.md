# Academic Ya! — Arquitectura de IA

> **Principio:** La aplicación NO debe quedar acoplada a un único proveedor de IA

---

## 1. Visión general

Academic Ya! utiliza IA en múltiples puntos del flujo académico. Todos los consumidores de IA interactúan con una **abstracción `AIProvider`**, permitiendo cambiar de proveedor (OpenAI, Anthropic, Google, local) sin reescribir lógica de negocio.

```
┌─────────────────────────────────────────────────────────┐
│                    Business Services                       │
│  CurriculumService │ CheckinService │ TutorService │ ...  │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    AIProvider (interface)                │
│  generateText │ generateSummary │ generateQuestions │     │
│  evaluateAnswer │ generateEmbeddings │ analyzeContent   │
└──────────────────────────┬──────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │  OpenAI  │ │ Anthropic│ │  Local   │
        │ Provider │ │ Provider │ │ Provider │
        └──────────┘ └──────────┘ └──────────┘
```

---

## 2. Interfaz AIProvider

```typescript
// infrastructure/ai/ai-provider.interface.ts (conceptual)

interface AIGenerateTextOptions {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  context?: RAGContext[];
}

interface AIGenerateQuestionsOptions {
  concept: string;
  difficulty: number;       // 1-5
  count: number;
  context?: RAGContext[];
  excludeHashes?: string[]; // RF-123 — evitar repetición
}

interface AIEvaluateAnswerOptions {
  question: string;
  correctAnswer: string;
  studentAnswer: string;
  concept?: string;
}

interface AIAnalyzeContentOptions {
  content: string;
  analysisType: 'topics' | 'concepts' | 'summary' | 'keywords' | 'exercises';
  courseContext?: string;
}

interface RAGContext {
  content: string;
  source: { materialId: string; title: string; page?: number };
}

interface AIProvider {
  // Texto general
  generateText(options: AIGenerateTextOptions): Promise<string>;

  // Resúmenes
  generateSummary(content: string, maxLength?: number): Promise<string>;

  // Preguntas (diagnóstico, práctica)
  generateQuestions(options: AIGenerateQuestionsOptions): Promise<GeneratedQuestion[]>;

  // Evaluación
  evaluateAnswer(options: AIEvaluateAnswerOptions): Promise<EvaluationResult>;

  // Embeddings (RAG)
  generateEmbeddings(texts: string[]): Promise<number[][]>;

  // Análisis de contenido
  analyzeContent(options: AIAnalyzeContentOptions): Promise<AnalysisResult>;

  // Metadata
  readonly modelName: string;
  readonly embeddingDimensions: number;
}
```

---

## 3. Factory y configuración

```typescript
// infrastructure/ai/ai.factory.ts (conceptual)

function createAIProvider(config: AIConfig): AIProvider {
  switch (config.provider) {
    case 'openai':
      return new OpenAIProvider(config.apiKey, config.model);
    case 'anthropic':
      return new AnthropicProvider(config.apiKey, config.model);
    default:
      throw new Error(`Unknown AI provider: ${config.provider}`);
  }
}

// Env vars
// AI_PROVIDER=openai
// AI_API_KEY=sk-...
// AI_MODEL=gpt-4o
// AI_EMBEDDING_MODEL=text-embedding-3-small
```

---

## 4. Casos de uso de IA por módulo

| Módulo | Caso de uso | Método AIProvider | RF | Fase |
|--------|-------------|-------------------|-----|------|
| Curriculum | Extraer materias de PDF | analyzeContent | RF-023–029 | MVP |
| Curriculum | Detectar inconsistencias | analyzeContent | RF-031 | MVP |
| Materials | Generar metadata | analyzeContent | RF-060 | MVP |
| Check-in | Sugerir temas vistos | analyzeContent | RF-085 | MVP |
| Check-in | Generar preguntas diagnósticas | generateQuestions | RF-089 | MVP |
| Check-in | Analizar respuestas | evaluateAnswer | RF-090 | MVP |
| Knowledge | Calcular dominio | evaluateAnswer + lógica | RF-091–098 | MVP |
| Tutor | Responder preguntas | generateText + RAG | RF-100–106 | MVP |
| Practice | Generar ejercicios | generateQuestions | RF-116–123 | MVP |
| Practice | Explicar errores | evaluateAnswer | RF-122 | MVP |
| Classes | Transcripción | Provider-specific (Whisper) | RF-063 | Fase 2 |
| Classes | Detectar temas/conceptos | analyzeContent | RF-064–065 | Fase 2 |
| Classes | Resumen y keywords | generateSummary, analyzeContent | RF-066–067 | Fase 2 |
| Learning Plan | Generar plan | generateText | RF-107–115 | Fase 2 |
| Resources | Buscar y clasificar | generateText + external | RF-125–129 | Fase 2 |
| Preparation | Recomendación pre-clase | generateText | RF-131–137 | Fase 2 |

---

## 5. Arquitectura RAG

### 5.1 Pipeline de indexación

```
Material Upload
      ↓
Text Extraction (PDF: pdf-parse, DOC: mammoth)
      ↓
Text Cleaning (remove headers/footers, normalize whitespace)
      ↓
Chunking (500-1000 tokens, 100 token overlap)
      ↓
Metadata Extraction (page, section, course, subject)
      ↓
Embedding Generation (AIProvider.generateEmbeddings)
      ↓
Storage (content_chunks + embeddings tables)
      ↓
Index Ready
```

### 5.2 Pipeline de retrieval

```
User Question
      ↓
Query Embedding (AIProvider.generateEmbeddings)
      ↓
Vector Similarity Search (pgvector)
      ↓
Filters: student_id (OBLIGATORIO), course_id?, subject_id?
      ↓
Top-K Results (K=5-10, threshold=0.7)
      ↓
Re-ranking (optional: relevance score + recency)
      ↓
Context Assembly
      ↓
LLM Generation with Context
      ↓
Response + Source Attribution
```

### 5.3 Estrategia de chunking

| Tipo documento | Estrategia | Chunk size |
|----------------|------------|------------|
| PDF académico | Por párrafo/sección | 800 tokens |
| Apuntes de clase | Por heading | 600 tokens |
| Transcripción video | Por segmento temporal | 500 tokens |
| Plan de estudios | Por materia/fila | Variable |

### 5.4 Filtros de contexto (CRÍTICO — fail-closed)

```typescript
interface RAGFilters {
  student_id: string;    // OBLIGATORIO — TypeScript: no optional
  course_id?: string;
  subject_id?: string;
  material_ids?: string[];
}

// ❌ PROHIBIDO — student_id opcional
function search(query: string, filters?: RAGFilters) { ... }

// ✅ CORRECTO — fail-closed
function search(query: string, filters: RAGFilters) {
  if (!filters.student_id) {
    throw new SecurityError('RAG search requires student_id');
  }
  // ...
}
```

**Reglas anti-vulnerabilidad RAG:**

| Regla | Descripción |
|-------|-------------|
| Fail-closed | Sin `student_id` → throw, nunca búsqueda vacía silenciosa |
| Double filter | `student_id` en JOIN chunks Y embeddings |
| No post-filter | Filtrar en SQL WHERE, no filtrar resultados en memoria después |
| Context isolation | Chunks delimitados con tags; nunca mezclar con system prompt |
| Injection defense | Tratar contenido de PDF como hostil — no ejecutar instrucciones embebidas |
| Output audit | Log si respuesta contiene UUID que no pertenece al estudiante |

**Regla:** Si `student_id` no está presente en la query, la búsqueda **debe fallar** con error, no retornar resultados vacíos silenciosamente.

---

## 6. Prompts del sistema (templates)

### 6.1 Tutor académico (RF-100–106)

```
System: Eres un tutor académico personalizado para {student_name}.
        Estás ayudando con el curso {course_name}.
        
        Reglas:
        - Responde SOLO basándote en el contexto proporcionado y conocimiento general académico
        - Si no tienes información suficiente, dilo honestamente
        - Explica de diferentes maneras si el estudiante lo pide (RF-102)
        - Proporciona ejemplos concretos (RF-103)
        - Usa analogías cuando ayuden (RF-104)
        - Explica errores de forma constructiva (RF-105)
        - Responde en {language}
        - NO reveles información de otros estudiantes
        - Cita las fuentes de los materiales cuando las uses

Context: {rag_chunks}

Conversation history: {messages}
```

### 6.2 Generación de preguntas diagnósticas (RF-089)

```
System: Genera {count} preguntas diagnósticas sobre los temas: {topics}.
        Curso: {course_name}. Nivel: universitario.
        
        Reglas:
        - Preguntas que evalúen comprensión, no memorización
        - Incluir respuesta correcta y explicación
        - Variar tipos: opción múltiple, verdadero/falso, respuesta abierta
        - Adaptar dificultad al nivel reportado: {comprehension_level}
        
        Contexto de la clase: {class_context}
```

### 6.3 Generación de ejercicios (RF-116–123)

```
System: Genera {count} ejercicios de práctica para el concepto: {concept}.
        Dominio actual del estudiante: {mastery}%.
        Dificultad solicitada: {difficulty}/5.
        
        Reglas:
        - Basarse en el contenido de clase y materiales del profesor (RF-118, RF-119)
        - Adaptar dificultad al dominio (RF-120)
        - Incluir solución paso a paso (RF-121)
        - NO repetir estos ejercicios previos: {exclude_hashes} (RF-123)
        - Incluir explicación para respuestas incorrectas (RF-122)
        
        Materiales de referencia: {rag_chunks}
```

### 6.4 Extracción de plan de estudios (RF-023–029)

```
System: Analiza el siguiente texto extraído de un plan de estudios universitario.
        Extrae en formato JSON estructurado:
        - subjects: [{ code, name, credits, semester, is_elective }]
        - prerequisites: [{ subject_code, prerequisite_code }]
        
        Reglas:
        - Identificar códigos de materia (RF-025)
        - Identificar créditos (RF-026)
        - Identificar prerrequisitos (RF-027)
        - Identificar electivas (RF-028)
        - Marcar inconsistencias (RF-031): códigos duplicados, prerrequisitos circulares, créditos faltantes
        
        Texto del documento: {extracted_text}
```

---

## 7. Motor de conocimiento (Knowledge Engine)

### 7.1 Modelo de dominio

```
ConceptMastery = weighted_average(evidences)

Evidences:
  - checkin_diagnostic:    weight 0.30
  - practice_results:      weight 0.25
  - tutor_interactions:    weight 0.10
  - assessment_formal:     weight 0.25
  - error_patterns:        weight 0.10
```

### 7.2 Actualización de dominio (RF-091–098)

```
Event: checkin.completed / practice.completed / assessment.completed
  ↓
For each affected concept:
  1. Calculate score from responses (0-100)
  2. Create MasteryEvidence with impact
  3. Recalculate ConceptMastery (weighted moving average)
  4. If mastery < threshold (60%):
     → Create/update KnowledgeGap
     → Calculate priority_score considering:
        - severity (mastery level)
        - prerequisite_missing (RF-096)
        - next_assessment_date proximity (RF-097)
        - upcoming_class proximity
  5. If mastery >= threshold and gap exists:
     → Update gap status to 'improving' or 'resolved'
```

### 7.3 Clasificación de brechas (RF-094)

| Severity | Mastery % | Descripción |
|----------|-----------|-------------|
| critical | 0–30 | Requiere atención inmediata |
| high | 31–50 | Reforzar pronto |
| medium | 51–65 | Monitorear |
| low | 66–79 | Mejora incremental |

### 7.4 Priorización (RF-095)

```
priority_score = (
  severity_weight * 0.35 +
  prerequisite_factor * 0.25 +
  assessment_proximity * 0.20 +
  class_proximity * 0.15 +
  recency_factor * 0.05
) * 100
```

---

## 8. Procesamiento de documentos (MVP)

```
UPLOAD (HTTP sync)
  ↓
VALIDATION (MIME, size, ownership)
  ↓
STORAGE (Supabase Storage)
  ↓
JOB ENQUEUED (processing_jobs)
  ↓ [async worker]
TEXT EXTRACTION
  ├── PDF → pdf-parse
  ├── DOCX → mammoth
  └── PPTX → officeparser (o similar)
  ↓
CLEANING (normalize, remove noise)
  ↓
CHUNKING (strategy by type)
  ↓
METADATA (title, pages, sections)
  ↓
EMBEDDINGS (batch generateEmbeddings)
  ↓
INDEXING (insert content_chunks + embeddings)
  ↓
STATUS: completed
```

---

## 9. Procesamiento de videos (Fase 2)

```
UPLOAD → VALIDATION → STORAGE → JOB ENQUEUED
  ↓ [async worker]
AUDIO EXTRACTION (ffmpeg)
  ↓
TRANSCRIPTION (Whisper API / provider-specific)
  ↓
TRANSCRIPT SEGMENTATION (timestamps)
  ↓
TOPIC DETECTION (analyzeContent: 'topics')
  ↓
CONCEPT DETECTION (analyzeContent: 'concepts')
  ↓
SUMMARY (generateSummary)
  ↓
KEYWORDS (analyzeContent: 'keywords')
  ↓
EXERCISE DETECTION (analyzeContent: 'exercises')
  ↓
CHUNKING + EMBEDDINGS (transcript segments)
  ↓
INDEXING
  ↓
STATUS: completed
```

**Nota:** Procesamiento de video es CPU/GPU intensivo. Debe ejecutarse en worker separado, nunca en el request HTTP principal.

---

## 10. Costos y límites

| Operación | Est. tokens/request | Límite/hora/user |
|-----------|--------------------|--------------------|
| Tutor chat | 2000–4000 | 30 requests |
| Diagnostic questions | 1000–2000 | Incluido en check-in |
| Practice generation | 3000–6000 | 20 requests |
| PDF extraction | 5000–15000 | 5 uploads |
| Embeddings (batch) | 500/chunk | Sin límite directo (async) |
| Video transcription | Provider-specific | 2 videos/día (Fase 2) |

### Estrategias de optimización

- Cache de embeddings (no regenerar si contenido no cambió)
- Batch embedding generation (hasta 100 chunks por batch)
- Usar modelos más económicos para tareas simples (metadata, clasificación)
- Modelos premium solo para tutor y generación de ejercicios complejos

---

## 11. Observabilidad de IA

| Métrica | Descripción |
|---------|-------------|
| `ai.request.count` | Requests por provider/method |
| `ai.request.latency` | Latencia por operación |
| `ai.token.usage` | Tokens consumidos |
| `ai.error.rate` | Errores por provider |
| `rag.retrieval.count` | Búsquedas RAG |
| `rag.retrieval.empty` | Búsquedas sin resultados |
| `rag.chunk.count` | Chunks indexados por estudiante |

Logs estructurados (sin PII ni contenido completo):
```json
{
  "event": "ai.generateText",
  "provider": "openai",
  "model": "gpt-4o",
  "tokens_in": 1500,
  "tokens_out": 800,
  "latency_ms": 2300,
  "student_id": "uuid",
  "feature": "tutor"
}
```

---

## 12. Testing de IA

| Test | Tipo | Descripción |
|------|------|-------------|
| Provider interface | Unit | Mock provider implementa interface |
| Prompt templates | Unit | Templates renderizan correctamente |
| RAG filtering | Integration | Solo retorna chunks del student_id |
| Question generation | Integration | Retorna formato válido |
| Answer evaluation | Integration | Evalúa correctamente/incorrectamente |
| PDF extraction | Integration | Extrae materias de PDF sample |
| Cost limits | Unit | Rate limiter funciona |
| Fallback | Unit | Error de provider retorna error graceful |

**Nota:** Tests de calidad de IA (evals) se implementarán como suite separada con datasets de evaluación.

---

## 13. Referencias

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Diagrama RAG
- [SECURITY.md](./SECURITY.md) — Seguridad RAG y prompts
- [DATABASE.md](./DATABASE.md) — content_chunks, embeddings
- [API.md](./API.md) — Endpoints tutor, practice, check-in
