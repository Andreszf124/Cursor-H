# Academic Copilot — Matriz de Trazabilidad

> **Formato:** RF → HU → Módulo → Frontend → Endpoint → Service → Database → Test  
> **Leyenda fases:** 🟢 MVP · 🟡 Fase 2 · 🔴 Fase 3

---

## Módulo 1 — Usuarios y Autenticación 🟢

| RF | HU | Frontend | Endpoint | Service | Database | Test |
|----|-----|----------|----------|---------|----------|------|
| RF-001 | HU-001 | `RegisterPage` | `POST /api/v1/auth/register` | `AuthService.register` | Supabase Auth | `auth.service.test.ts` |
| RF-002 | HU-002 | `LoginPage` | `POST /api/v1/auth/login` | `AuthService.login` | Supabase Auth | `auth.service.test.ts` |
| RF-003 | HU-002 | `AppShell` (logout btn) | `POST /api/v1/auth/logout` | `AuthService.logout` | Supabase Auth | `auth.service.test.ts` |
| RF-004 | HU-003 | `ForgotPasswordPage` | `POST /api/v1/auth/forgot-password` | `AuthService.forgotPassword` | Supabase Auth | `auth.service.test.ts` |
| RF-005 | HU-004 | `ProfilePage` | `PATCH /api/v1/profile` | `ProfileService.update` | `profiles` | `profile.service.test.ts` |
| RF-006 | HU-004 | `ProfilePage` (avatar) | `POST /api/v1/profile/avatar` | `ProfileService.uploadAvatar` | `profiles`, Storage `avatars/` | `profile.service.test.ts` |
| RF-007 | HU-004 | `ProfilePage` (prefs) | `PATCH /api/v1/profile/preferences` | `ProfileService.updatePreferences` | `learning_preferences` | `profile.service.test.ts` |
| RF-008 | HU-004 | `ProfilePage` (language) | `PATCH /api/v1/profile` | `ProfileService.update` | `profiles.language` | `profile.service.test.ts` |
| RF-009 | HU-004 | `ProfilePage` (delete) | `DELETE /api/v1/auth/account` | `AuthService.deleteAccount` | Supabase Auth + cascade | `auth.service.test.ts` |
| RF-010 | HU-001–004 | — (transversal) | — (middleware) | `auth.middleware` + RLS | All tables RLS | `security.idor.test.ts` |

---

## Módulo 2 — Institución, Carrera y Período 🟢

| RF | HU | Frontend | Endpoint | Service | Database | Test |
|----|-----|----------|----------|---------|----------|------|
| RF-011 | HU-005 | `CareerSetupPage` (step 1) | `GET /api/v1/institutions` | `CareerService.listInstitutions` | `institutions` | `career.service.test.ts` |
| RF-012 | HU-005 | `CareerSetupPage` (custom) | `POST /api/v1/institutions` | `CareerService.createInstitution` | `institutions` | `career.service.test.ts` |
| RF-013 | HU-006 | `CareerSetupPage` (step 2) | `POST /api/v1/career/setup` | `CareerService.setupCareer` | `careers`, `student_careers` | `career.service.test.ts` |
| RF-014 | HU-006 | `CareerSetupPage` | `POST /api/v1/career/setup` | `CareerService.setupCareer` | `careers.degree_level` | `career.service.test.ts` |
| RF-015 | HU-006 | `CareerSetupPage` (step 3) | `POST /api/v1/academic-periods` | `CareerService.createPeriod` | `academic_periods` | `career.service.test.ts` |
| RF-016 | HU-006 | `CareerSetupPage` | `PATCH /api/v1/academic-periods/:id/activate` | `CareerService.activatePeriod` | `academic_periods` | `career.service.test.ts` |
| RF-017 | HU-007 | `AcademicHistoryPage` | `GET /api/v1/academic-history` | `CareerService.getHistory` | `student_subject_status` | `career.service.test.ts` |
| RF-018 | HU-007 | `AcademicHistoryPage` | `POST /api/v1/subjects/:id/status` | `CareerService.updateSubjectStatus` | `student_subject_status` | `career.service.test.ts` |
| RF-019 | HU-007 | `AcademicHistoryPage` | `POST /api/v1/subjects/:id/status` | `CareerService.updateSubjectStatus` | `student_subject_status` | `career.service.test.ts` |
| RF-020 | HU-008 | `ProgressOverview` | `GET /api/v1/academic-progress` | `CareerService.calculateProgress` | `student_subject_status`, `subjects` | `career.service.test.ts` |

---

## Módulo 3 — Plan de Estudios PDF 🟢

| RF | HU | Frontend | Endpoint | Service | Database | Test |
|----|-----|----------|----------|---------|----------|------|
| RF-021 | HU-009 | `CurriculumImportPage` | `POST /api/v1/curriculum/import` | `CurriculumService.upload` | `curriculum_imports`, Storage | `curriculum.service.test.ts` |
| RF-022 | HU-009 | `CurriculumImportPage` | `POST /api/v1/curriculum/import` | `CurriculumService.validateFile` | — | `curriculum.validation.test.ts` |
| RF-023 | HU-009 | — (async) | — (job) | `CurriculumService.extractText` | `processing_jobs` | `curriculum.extract.test.ts` |
| RF-024 | HU-009 | `SubjectReviewTable` | `GET /api/v1/curriculum/imports/:id` | `CurriculumService.parseSubjects` | `curriculum_imports.extracted_data` | `curriculum.extract.test.ts` |
| RF-025 | HU-009 | `SubjectReviewTable` | — (AI) | `AIProvider.analyzeContent` | — | `curriculum.extract.test.ts` |
| RF-026 | HU-009 | `SubjectReviewTable` | — (AI) | `AIProvider.analyzeContent` | — | `curriculum.extract.test.ts` |
| RF-027 | HU-010 | `PrerequisiteGraph` | `GET /api/v1/subjects/:id/prerequisites` | `CurriculumService.getPrerequisites` | `prerequisites` | `curriculum.service.test.ts` |
| RF-028 | HU-009 | `SubjectReviewTable` | — (AI) | `AIProvider.analyzeContent` | — | `curriculum.extract.test.ts` |
| RF-029 | HU-009 | `SubjectReviewTable` | `GET /api/v1/curriculum/imports/:id` | `CurriculumService.generateStructure` | `subjects`, `prerequisites` | `curriculum.service.test.ts` |
| RF-030 | HU-011 | `SubjectReviewTable` (edit) | `PATCH /api/v1/curriculum/imports/:id` | `CurriculumService.updateExtracted` | `curriculum_imports` | `curriculum.service.test.ts` |
| RF-031 | HU-011 | `InconsistencyAlert` | `GET /api/v1/curriculum/imports/:id/inconsistencies` | `CurriculumService.detectInconsistencies` | `curriculum_imports.inconsistencies` | `curriculum.service.test.ts` |

---

## Módulo 4 — Cursos y Horario 🟢

| RF | HU | Frontend | Endpoint | Service | Database | Test |
|----|-----|----------|----------|---------|----------|------|
| RF-032 | HU-012 | `CoursesPage`, `CourseForm` | `POST /api/v1/courses` | `CourseService.create` | `courses` | `course.service.test.ts` |
| RF-033 | HU-012 | `CourseForm` (subject) | `POST /api/v1/courses` | `CourseService.create` | `courses.subject_id` | `course.service.test.ts` |
| RF-034 | HU-012 | `CourseForm` (professor) | `POST /api/v1/professors` | `CourseService.createProfessor` | `professors` | `course.service.test.ts` |
| RF-035 | HU-013 | `ScheduleForm` | `POST /api/v1/schedules` | `ScheduleService.create` | `schedules` | `schedule.service.test.ts` |
| RF-036 | HU-013 | `ScheduleForm` (classroom) | `POST /api/v1/classrooms` | `ScheduleService.createClassroom` | `classrooms` | `schedule.service.test.ts` |
| RF-037 | HU-012 | `CourseForm` (modality) | `POST /api/v1/courses` | `CourseService.create` | `courses.modality` | `course.service.test.ts` |
| RF-038 | HU-014 | `WeeklyCalendar` | `GET /api/v1/schedules?week=` | `ScheduleService.getWeeklyCalendar` | `schedules`, `courses` | `schedule.service.test.ts` |
| RF-039 | HU-013 | `ScheduleForm` (edit) | `PATCH /api/v1/schedules/:id` | `ScheduleService.update` | `schedules` | `schedule.service.test.ts` |
| RF-040 | HU-013 | `ScheduleForm` (delete) | `DELETE /api/v1/schedules/:id` | `ScheduleService.delete` | `schedules` | `schedule.service.test.ts` |
| RF-041 | HU-013 | — (scheduler) | — (internal) | `ScheduleService.detectClassEnd` | `schedules` | `schedule.detection.test.ts` |

---

## Módulo 5 — Campus Virtual 🔴

| RF | HU | Frontend | Endpoint | Service | Database | Test |
|----|-----|----------|----------|---------|----------|------|
| RF-042 | HU-015 | `IntegrationsPage` | `POST /api/v1/integrations/campus/connect` | `IntegrationService.connectCampus` | `integrations` | `integration.service.test.ts` |
| RF-043 | HU-015 | Extensión browser | — (extension) | — | — | `extension.test.ts` |
| RF-044 | HU-015 | Extensión browser | — (extension) | `ExtensionService.detectCourse` | — | `extension.test.ts` |
| RF-045 | HU-016 | Extensión browser | — (extension) | `ExtensionService.detectMaterials` | — | `extension.test.ts` |
| RF-046 | HU-016 | `IntegrationsPage` | `POST /api/v1/integrations/campus/import` | `IntegrationService.importDocuments` | `materials` | `integration.service.test.ts` |
| RF-047 | HU-016 | `IntegrationsPage` | `POST /api/v1/integrations/campus/import` | `IntegrationService.importLinks` | `materials` | `integration.service.test.ts` |
| RF-048 | HU-016 | `IntegrationsPage` | `POST /api/v1/integrations/campus/import` | `IntegrationService.importTasks` | — | `integration.service.test.ts` |
| RF-049 | HU-017 | `IntegrationsPage` | `DELETE /api/v1/integrations/campus/disconnect` | `IntegrationService.disconnect` | `integrations` | `integration.service.test.ts` |
| RF-050 | HU-015 | — (design) | — | — | No password storage | `security.integration.test.ts` |

---

## Módulo 6 — Materiales Académicos 🟢

| RF | HU | Frontend | Endpoint | Service | Database | Test |
|----|-----|----------|----------|---------|----------|------|
| RF-051 | HU-018 | `MaterialsPage` (upload) | `POST /api/v1/materials` | `MaterialService.upload` | `materials`, Storage | `material.service.test.ts` |
| RF-052 | HU-018 | `MaterialsPage` | `POST /api/v1/materials` | `MaterialService.upload` | `materials` | `material.validation.test.ts` |
| RF-053 | HU-018 | `MaterialsPage` | `POST /api/v1/materials` | `MaterialService.upload` | `materials` | `material.validation.test.ts` |
| RF-054 | HU-018 | `MaterialsPage` | `POST /api/v1/materials` | `MaterialService.upload` | `materials` | `material.validation.test.ts` |
| RF-055 | HU-018 | `MaterialsPage` | `POST /api/v1/materials` | `MaterialService.upload` | `materials` | `material.validation.test.ts` |
| RF-056 | HU-019 | `MaterialForm` (course) | `POST /api/v1/materials` | `MaterialService.upload` | `materials.course_id` | `material.service.test.ts` |
| RF-057 | HU-018 | `MaterialForm` (category) | `PATCH /api/v1/materials/:id` | `MaterialService.update` | `materials.category` | `material.service.test.ts` |
| RF-058 | HU-020 | `MaterialsPage` (search) | `GET /api/v1/materials/search` | `MaterialService.search` | `materials` (GIN index) | `material.service.test.ts` |
| RF-059 | HU-018 | `MaterialCard` (delete) | `DELETE /api/v1/materials/:id` | `MaterialService.delete` | `materials.deleted_at` | `material.service.test.ts` |
| RF-060 | HU-019 | — (async) | — (job) | `MaterialService.generateMetadata` | `materials.metadata` | `material.processing.test.ts` |

---

## Módulo 7 — Análisis de Clases y Videos 🟡

| RF | HU | Frontend | Endpoint | Service | Database | Test |
|----|-----|----------|----------|---------|----------|------|
| RF-061 | HU-021 | `VideoUploadPage` | `POST /api/v1/classes/:courseId/videos` | `ClassService.uploadVideo` | `materials` (type=video) | `class.service.test.ts` |
| RF-062 | HU-021 | — (async) | — (job) | `ClassService.extractAudio` | `processing_jobs` | `class.processing.test.ts` |
| RF-063 | HU-021 | `TranscriptView` | `GET /api/v1/classes/videos/:id/transcript` | `ClassService.transcribe` | `transcripts` | `class.processing.test.ts` |
| RF-064 | HU-022 | `TopicsList` | `GET /api/v1/classes/videos/:id/topics` | `ClassService.detectTopics` | `extracted_concepts` | `class.analysis.test.ts` |
| RF-065 | HU-022 | `ConceptsList` | `GET /api/v1/classes/videos/:id/concepts` | `ClassService.detectConcepts` | `extracted_concepts` | `class.analysis.test.ts` |
| RF-066 | HU-022 | `VideoSummary` | `GET /api/v1/classes/videos/:id/summary` | `ClassService.generateSummary` | `materials.metadata` | `class.analysis.test.ts` |
| RF-067 | HU-022 | `VideoSummary` (keywords) | `GET /api/v1/classes/videos/:id/summary` | `ClassService.extractKeywords` | `materials.metadata` | `class.analysis.test.ts` |
| RF-068 | HU-023 | `ConceptTimestamp` | `GET /api/v1/classes/videos/:id/timestamp` | `ClassService.getConceptTimestamp` | `transcript_segments` | `class.analysis.test.ts` |
| RF-069 | HU-024 | `VideoChatPanel` | `POST /api/v1/classes/videos/:id/ask` | `ClassService.askAboutVideo` | `tutor_messages` | `class.service.test.ts` |
| RF-070 | HU-023 | `VideoPlayer` (seek) | `GET /api/v1/classes/videos/:id/timestamp` | `ClassService.getConceptTimestamp` | `transcript_segments` | `class.analysis.test.ts` |
| RF-071 | HU-022 | `ExercisesList` | `GET /api/v1/classes/videos/:id/concepts` | `ClassService.detectExercises` | `extracted_concepts` | `class.analysis.test.ts` |
| RF-072 | HU-022 | `ExamplesList` | `GET /api/v1/classes/videos/:id/concepts` | `ClassService.detectExamples` | `extracted_concepts` | `class.analysis.test.ts` |

---

## Módulo 8 — Microsoft Teams 🔴

| RF | HU | Frontend | Endpoint | Service | Database | Test |
|----|-----|----------|----------|---------|----------|------|
| RF-073 | HU-025 | `IntegrationsPage` (Teams) | `POST /api/v1/integrations/teams/connect` | `TeamsService.connect` | `integrations` | `teams.service.test.ts` |
| RF-074 | HU-025 | `TeamsPermissionDialog` | `POST /api/v1/integrations/teams/connect` | `TeamsService.requestPermissions` | — | `teams.service.test.ts` |
| RF-075 | HU-025 | `TeamsMeetingsList` | `GET /api/v1/integrations/teams/meetings` | `TeamsService.listMeetings` | — | `teams.service.test.ts` |
| RF-076 | HU-026 | — (async) | — (job) | `TeamsService.fetchTranscript` | `transcripts` | `teams.service.test.ts` |
| RF-077 | HU-026 | — (async) | — (job) | `TeamsService.fetchRecording` | `materials` | `teams.service.test.ts` |
| RF-078 | HU-027 | `MeetingCourseLink` | `PATCH /api/v1/integrations/teams/meetings/:id` | `TeamsService.linkToCourse` | `integrations.config` | `teams.service.test.ts` |
| RF-079 | HU-026 | — (async) | — (job) | `ClassService.processTranscript` | `transcripts` | `teams.service.test.ts` |
| RF-080 | HU-025 | `IntegrationsPage` | `DELETE /api/v1/integrations/teams/disconnect` | `TeamsService.disconnect` | `integrations` | `teams.service.test.ts` |

---

## Módulo 9 — Check-in Después de Clase 🟢

| RF | HU | Frontend | Endpoint | Service | Database | Test |
|----|-----|----------|----------|---------|----------|------|
| RF-081 | HU-028 | — (scheduler) | — (internal) | `CheckinService.detectClassEnd` | `checkins` | `checkin.detection.test.ts` |
| RF-082 | HU-028, HU-054 | `NotificationBell` | — (notification) | `NotificationService.sendCheckin` | `notifications` | `checkin.notification.test.ts` |
| RF-083 | HU-028 | `CheckinPage` (header) | `GET /api/v1/checkins/:id` | `CheckinService.getById` | `checkins.course_id` | `checkin.service.test.ts` |
| RF-084 | HU-029 | `CheckinPage` (step 1) | `PATCH /api/v1/checkins/:id/topics` | `CheckinService.recordTopics` | `checkin_topics` | `checkin.service.test.ts` |
| RF-085 | HU-029 | `TopicSuggestions` | `GET /api/v1/checkins/:id` | `CheckinService.suggestTopics` | `checkin_topics` | `checkin.service.test.ts` |
| RF-086 | HU-029 | `TopicSelector` | `PATCH /api/v1/checkins/:id/topics` | `CheckinService.confirmTopics` | `checkin_topics` | `checkin.service.test.ts` |
| RF-087 | HU-028 | `CheckinPage` (step 2) | `PATCH /api/v1/checkins/:id/comprehension` | `CheckinService.recordComprehension` | `checkins.comprehension_level` | `checkin.service.test.ts` |
| RF-088 | HU-030 | `CheckinPage` (step 2) | `PATCH /api/v1/checkins/:id/comprehension` | `CheckinService.recordDifficulties` | `checkins.difficulties` | `checkin.service.test.ts` |
| RF-089 | HU-031 | `DiagnosticQuiz` | `POST /api/v1/checkins/:id/diagnostic` | `CheckinService.generateDiagnostic` | `assessment_questions` | `checkin.diagnostic.test.ts` |
| RF-090 | HU-031 | `DiagnosticQuiz` (submit) | `POST /api/v1/checkins/:id/diagnostic/submit` | `CheckinService.analyzeResponses` | `assessment_responses` | `checkin.diagnostic.test.ts` |

---

## Módulo 10 — Evaluación y Brechas 🟢

| RF | HU | Frontend | Endpoint | Service | Database | Test |
|----|-----|----------|----------|---------|----------|------|
| RF-091 | HU-032 | `GapsPage`, `MasteryChart` | `GET /api/v1/concepts/:id/mastery` | `KnowledgeService.getMastery` | `concept_mastery` | `knowledge.service.test.ts` |
| RF-092 | HU-032 | `MasteryChart` | `GET /api/v1/concepts/:id/mastery` | `KnowledgeService.calculatePercentage` | `concept_mastery.mastery_percentage` | `knowledge.mastery.test.ts` |
| RF-093 | HU-032 | `GapsPage` | `GET /api/v1/knowledge-gaps` | `KnowledgeService.getActiveGaps` | `knowledge_gaps` | `knowledge.service.test.ts` |
| RF-094 | HU-032 | `GapCard` (severity) | `GET /api/v1/knowledge-gaps/:id` | `KnowledgeService.classifyGap` | `knowledge_gaps.severity` | `knowledge.gap.test.ts` |
| RF-095 | HU-033 | `GapsPage` (sorted) | `GET /api/v1/knowledge-gaps/prioritized` | `KnowledgeService.prioritizeGaps` | `knowledge_gaps.priority_score` | `knowledge.gap.test.ts` |
| RF-096 | HU-033 | `GapCard` (prereq) | `GET /api/v1/knowledge-gaps/prioritized` | `KnowledgeService.checkPrerequisites` | `knowledge_gaps.prerequisite_missing` | `knowledge.gap.test.ts` |
| RF-097 | HU-033 | `GapCard` (assessment) | `GET /api/v1/knowledge-gaps/prioritized` | `KnowledgeService.considerAssessments` | `knowledge_gaps.next_assessment_date` | `knowledge.gap.test.ts` |
| RF-098 | HU-034 | `MasteryEvolutionChart` | `GET /api/v1/mastery/evolution` | `KnowledgeService.updateMastery` | `mastery_evidence` | `knowledge.mastery.test.ts` |

---

## Módulo 11 — Tutor Académico IA 🟢

| RF | HU | Frontend | Endpoint | Service | Database | Test |
|----|-----|----------|----------|---------|----------|------|
| RF-099 | HU-035 | `TutorPage` | `POST /api/v1/tutor/conversations` | `TutorService.createConversation` | `tutor_conversations` | `tutor.service.test.ts` |
| RF-100 | HU-035 | `TutorChat` | `POST /api/v1/tutor/chat` | `TutorService.chat` | `tutor_messages` | `tutor.service.test.ts` |
| RF-101 | HU-037 | `TutorChat` (sources) | `POST /api/v1/tutor/chat` | `RAGService.retrieve` | `content_chunks`, `embeddings` | `tutor.rag.test.ts` |
| RF-102 | HU-036 | `TutorChat` (rephrase) | `POST /api/v1/tutor/chat` | `TutorService.explainDifferently` | `tutor_messages` | `tutor.service.test.ts` |
| RF-103 | HU-035 | `TutorChat` | `POST /api/v1/tutor/chat` | `TutorService.provideExamples` | — | `tutor.service.test.ts` |
| RF-104 | HU-035 | `TutorChat` | `POST /api/v1/tutor/chat` | `TutorService.generateAnalogy` | — | `tutor.service.test.ts` |
| RF-105 | HU-035 | `TutorChat` | `POST /api/v1/tutor/chat` | `TutorService.explainError` | — | `tutor.service.test.ts` |
| RF-106 | HU-035 | `TutorChat` (course ctx) | `POST /api/v1/tutor/chat` | `TutorService.chatWithCourseContext` | `tutor_conversations.course_id` | `tutor.service.test.ts` |

---

## Módulo 12 — Plan Personalizado 🟡

| RF | HU | Frontend | Endpoint | Service | Database | Test |
|----|-----|----------|----------|---------|----------|------|
| RF-107 | HU-038 | `LearningPlanPage` | `POST /api/v1/learning-plans/generate` | `LearningPlanService.generate` | `learning_plans` | `learning-plan.service.test.ts` |
| RF-108 | HU-038 | `LearningPlanPage` | `POST /api/v1/learning-plans/generate` | `LearningPlanService.considerGaps` | `knowledge_gaps` | `learning-plan.service.test.ts` |
| RF-109 | HU-039 | `ActivityList` (duration) | `POST /api/v1/learning-plans/generate` | `LearningPlanService.considerTime` | `learning_plans.available_minutes` | `learning-plan.service.test.ts` |
| RF-110 | HU-038 | `LearningPlanPage` | `POST /api/v1/learning-plans/generate` | `LearningPlanService.considerNextClass` | `learning_plans.next_class_at` | `learning-plan.service.test.ts` |
| RF-111 | HU-038 | `ActivityCard` (technique) | — (AI) | `LearningPlanService.recommendTechniques` | `learning_activities.technique` | `learning-plan.service.test.ts` |
| RF-112 | HU-038 | `ActivityList` | `GET /api/v1/learning-plans/active` | `LearningPlanService.getActivities` | `learning_activities` | `learning-plan.service.test.ts` |
| RF-113 | HU-039 | `ActivityCard` (time) | `GET /api/v1/learning-plans/active` | `LearningPlanService.estimateDuration` | `learning_activities.estimated_minutes` | `learning-plan.service.test.ts` |
| RF-114 | HU-038 | `ActivityCard` (complete) | `PATCH .../activities/:id/complete` | `LearningPlanService.completeActivity` | `learning_activities.status` | `learning-plan.service.test.ts` |
| RF-115 | HU-040 | `LearningPlanPage` | — (trigger) | `LearningPlanService.adjustPlan` | `learning_plans` | `learning-plan.service.test.ts` |

---

## Módulo 13 — Generación de Prácticas 🟢

| RF | HU | Frontend | Endpoint | Service | Database | Test |
|----|-----|----------|----------|---------|----------|------|
| RF-116 | HU-041 | `PracticePage` | `POST /api/v1/practice/generate` | `PracticeService.generate` | `practices`, `exercises` | `practice.service.test.ts` |
| RF-117 | HU-041 | `PracticePage` | `POST /api/v1/practice/generate` | `PracticeService.useGaps` | `knowledge_gaps` | `practice.service.test.ts` |
| RF-118 | HU-042 | — (AI) | — | `PracticeService.useClassContent` | `checkin_topics` | `practice.service.test.ts` |
| RF-119 | HU-042 | — (AI) | — | `PracticeService.useProfessorExamples` | `content_chunks` (RAG) | `practice.service.test.ts` |
| RF-120 | HU-044 | `ExerciseCard` (level) | `POST /api/v1/practice/generate` | `PracticeService.adaptDifficulty` | `exercises.difficulty` | `practice.adaptation.test.ts` |
| RF-121 | HU-041 | `ExerciseCard` (solution) | `GET /api/v1/practice/:id` | `PracticeService.generateSolution` | `exercises.correct_answer` | `practice.service.test.ts` |
| RF-122 | HU-043 | `FeedbackPanel` | `POST .../exercises/:id/submit` | `PracticeService.explainIncorrect` | `exercise_attempts.feedback` | `practice.service.test.ts` |
| RF-123 | HU-041 | — (hash) | — | `PracticeService.excludeDuplicates` | `exercises.content_hash` | `practice.dedup.test.ts` |
| RF-124 | HU-044 | `PracticeResults` | `POST /api/v1/practice/:id/complete` | `PracticeService.recordResults` | `practices.score` | `practice.service.test.ts` |

---

## Módulo 14 — Recursos Educativos 🟡

| RF | HU | Frontend | Endpoint | Service | Database | Test |
|----|-----|----------|----------|---------|----------|------|
| RF-125 | HU-045 | `ResourcesPage` | `GET /api/v1/resources/search` | `ResourceService.search` | `educational_resources` | `resource.service.test.ts` |
| RF-126 | HU-045 | `ResourceCard` (type) | `GET /api/v1/resources/search` | `ResourceService.classifySources` | `educational_resources.source_type` | `resource.service.test.ts` |
| RF-127 | HU-045 | `ResourcesPage` (sorted) | `GET /api/v1/resources/search` | `ResourceService.prioritizeReliable` | `educational_resources.reliability_score` | `resource.service.test.ts` |
| RF-128 | HU-046 | `ResourceCard` (origin) | `GET /api/v1/resources/search` | `ResourceService.showOrigin` | `educational_resources.origin` | `resource.service.test.ts` |
| RF-129 | HU-045 | `ResourceCard` (reason) | `GET /api/v1/resources/search` | `ResourceService.explainRecommendation` | `educational_resources.recommendation_reason` | `resource.service.test.ts` |
| RF-130 | HU-047 | `ResourceCard` (save) | `POST /api/v1/resources/:id/save` | `ResourceService.saveResource` | `saved_resources` | `resource.service.test.ts` |

---

## Módulo 15 — Preparación Próxima Clase 🟡

| RF | HU | Frontend | Endpoint | Service | Database | Test |
|----|-----|----------|----------|---------|----------|------|
| RF-131 | HU-048 | `DashboardPage` (next) | `GET /api/v1/schedules/upcoming` | `PreparationService.identifyNextClass` | `schedules` | `preparation.service.test.ts` |
| RF-132 | HU-048 | `PreparationCard` | `GET /api/v1/preparation/next-class` | `PreparationService.identifyTopics` | `subjects`, `concepts` | `preparation.service.test.ts` |
| RF-133 | HU-048 | `PreparationCard` | `GET /api/v1/preparation/next-class` | `PreparationService.reviewMastery` | `concept_mastery` | `preparation.service.test.ts` |
| RF-134 | HU-048 | `PreparationCard` (gaps) | `GET /api/v1/preparation/next-class` | `PreparationService.identifyWeaknesses` | `knowledge_gaps` | `preparation.service.test.ts` |
| RF-135 | HU-048 | `PreparationCard` | `GET /api/v1/preparation/next-class` | `PreparationService.generateRecommendation` | — | `preparation.service.test.ts` |
| RF-136 | HU-049 | `PreparationCard` (CTA) | `POST /api/v1/preparation/generate-practice` | `PreparationService.generatePrePractice` | `practices` | `preparation.service.test.ts` |
| RF-137 | HU-050 | `PreparationCard` (time) | `GET /api/v1/preparation/next-class` | `PreparationService.estimatePrepTime` | — | `preparation.service.test.ts` |

---

## Módulo 16 — Progreso y Estadísticas 🟢

| RF | HU | Frontend | Endpoint | Service | Database | Test |
|----|-----|----------|----------|---------|----------|------|
| RF-138 | HU-051 | `ProgressPage` | `GET /api/v1/progress/overview` | `ProgressService.getOverview` | Multiple aggregation | `progress.service.test.ts` |
| RF-139 | HU-052 | `SubjectProgressChart` | `GET /api/v1/progress/by-subject` | `ProgressService.getBySubject` | `concept_mastery`, `subjects` | `progress.service.test.ts` |
| RF-140 | HU-052 | `ConceptMasteryChart` | `GET /api/v1/progress/by-concept` | `ProgressService.getByConcept` | `concept_mastery` | `progress.service.test.ts` |
| RF-141 | HU-053 | `AssessmentHistory` | `GET /api/v1/progress/assessments` | `ProgressService.getAssessments` | `assessments` | `progress.service.test.ts` |
| RF-142 | HU-053 | `EvolutionChart` | `GET /api/v1/progress/evolution` | `ProgressService.getEvolution` | `mastery_evidence` | `progress.service.test.ts` |
| RF-143 | HU-052 | `DifficultSubjects` | `GET /api/v1/progress/difficult-subjects` | `ProgressService.getDifficultSubjects` | `concept_mastery` | `progress.service.test.ts` |
| RF-144 | HU-051 | `ActivitySummary` | `GET /api/v1/progress/activities` | `ProgressService.getCompletedActivities` | `learning_activities`, `practices` | `progress.service.test.ts` |
| RF-145 | HU-051 | `StudyTimeChart` | `GET /api/v1/progress/study-time` | `ProgressService.getStudyTime` | `exercise_attempts`, `checkins` | `progress.service.test.ts` |

---

## Módulo 17 — Notificaciones 🟢/🟡

| RF | HU | Frontend | Endpoint | Service | Database | Test |
|----|-----|----------|----------|---------|----------|------|
| RF-146 | HU-054 | `NotificationBell` | — (scheduler) | `NotificationService.sendClassReminder` | `notifications` | `notification.service.test.ts` |
| RF-147 | HU-054 | `NotificationBell` | — (scheduler) | `NotificationService.sendCheckinReminder` | `notifications` | `notification.service.test.ts` |
| RF-148 | HU-055 | `NotificationBell` | `GET /api/v1/notifications` | `NotificationService.sendActivityReminder` | `notifications` | `notification.service.test.ts` |
| RF-149 | HU-055 | `NotificationBell` | `GET /api/v1/notifications` | `NotificationService.sendReviewReminder` | `notifications` | `notification.service.test.ts` |
| RF-150 | HU-055 | `NotificationBell` | `GET /api/v1/notifications` | `NotificationService.sendAssessmentReminder` | `notifications` | `notification.service.test.ts` |
| RF-151 | HU-056 | `NotificationSettingsPage` | `PATCH /api/v1/notifications/preferences` | `NotificationService.updatePreferences` | `notification_preferences` | `notification.service.test.ts` |

🟢 MVP: RF-146, RF-147 · 🟡 Fase 2: RF-148–151

---

## Módulo 18 — Administración y Seguridad 🟢/🔴

| RF | HU | Frontend | Endpoint | Service | Database | Test |
|----|-----|----------|----------|---------|----------|------|
| RF-152 | HU-057 | `AdminUsersPage` | `GET /api/v1/admin/users` | `AdminService.listUsers` | `profiles` | `admin.service.test.ts` |
| RF-153 | HU-057 | `AdminUsersPage` | `PATCH /api/v1/admin/users/:id/role` | `AdminService.managePermissions` | `profiles.role` | `admin.service.test.ts` |
| RF-154 | HU-058 | `AdminAuditPage` | `GET /api/v1/admin/audit-logs` | `AdminService.getAuditLogs` | `audit_logs` | `admin.service.test.ts` |
| RF-155 | HU-057 | `AdminUsersPage` | `PATCH /api/v1/admin/users/:id/block` | `AdminService.blockAccount` | `profiles` | `admin.service.test.ts` |
| RF-156 | HU-057 | `AdminIntegrationsPage` | `GET /api/v1/admin/integrations` | `AdminService.manageIntegrations` | `integrations` | `admin.service.test.ts` |
| RF-157 | HU-057 | `AdminStoragePage` | `PATCH /api/v1/admin/storage-limits/:userId` | `AdminService.manageStorageLimits` | `storage_quotas` | `admin.service.test.ts` |
| RF-158 | HU-059 | `ProfilePage` (delete) | `DELETE /api/v1/auth/account` | `AuthService.purgeData` | All student tables | `auth.delete.test.ts` |

🟢 MVP: RF-154, RF-158 · 🔴 Fase 3: RF-152, RF-153, RF-155–157

---

## Resumen de cobertura por fase

| Fase | RF | HU | Módulos |
|------|-----|-----|---------|
| 🟢 MVP | 107 | 44 | 1, 2, 3, 4, 6, 9, 10, 11, 13, 16 + slices 17, 18 |
| 🟡 Fase 2 | 41 | 12 | 7, 12, 14, 15 + resto 17 |
| 🔴 Fase 3 | 24 | 9 | 5, 8 + resto 18 |
| **Total** | **148** | **59** | **18** |

---

## Ejemplo de trazabilidad completa

```
RF-089
  → HU-031 (responder preguntas diagnósticas)
  → Módulo: checkin
  → Frontend: DiagnosticQuiz (features/checkin/components/)
  → Endpoint: POST /api/v1/checkins/:id/diagnostic
  → Service: CheckinService.generateDiagnostic()
  → AI: AIProvider.generateQuestions()
  → Database: assessment_questions, assessments
  → Test: checkin.diagnostic.test.ts
```

---

## Referencias

- [ANALYSIS.md](./ANALYSIS.md)
- [API.md](./API.md)
- [DATABASE.md](./DATABASE.md)
- [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md)
