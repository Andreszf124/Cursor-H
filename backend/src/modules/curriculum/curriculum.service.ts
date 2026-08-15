import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAIProvider, type CurriculumExtraction } from '../../infrastructure/ai/provider.js';
import { createUserClient } from '../../infrastructure/database/supabase.client.js';
import { AppError, NotFoundError, ValidationError } from '../../shared/errors/app-error.js';
import {
  detectPdf,
  extractTextFromPdf,
  MAX_CURRICULUM_PDF_BYTES,
} from '../../shared/utils/pdf-validation.js';
import {
  extractedPrerequisiteSchema,
  extractedSubjectSchema,
} from './curriculum.schemas.js';
import type {
  ConfirmImportResult,
  CurriculumImportDTO,
  ExtractedData,
  ExtractedPrerequisite,
  ExtractedSubject,
  ImportStatus,
  Inconsistency,
  SubjectDTO,
  UpdateImportInput,
} from './curriculum.types.js';

const CURRICULUM_BUCKET = 'curriculum';
const IMPORT_JOB_TYPE = 'curriculum_import';
const IMPORT_ENTITY_TYPE = 'curriculum_import';
const IMPORT_COLUMNS =
  'id, career_id, file_path, status, extracted_data, inconsistencies, error_message, reviewed_at, created_at';
const SUBJECT_COLUMNS = 'id, career_id, code, name, credits, semester, is_elective, source';

const MAX_SUBJECTS = 500;
const MAX_PREREQUISITES = 2000;

function normalizeCode(code: string): string {
  return code.replace(/\s+/g, '').toUpperCase();
}

/**
 * La salida de la IA es entrada no confiable: se normaliza y se valida
 * elemento por elemento, descartando lo que no cumpla el esquema.
 */
function sanitizeExtraction(raw: CurriculumExtraction): ExtractedData {
  const subjects: ExtractedSubject[] = [];

  for (const subject of raw.subjects.slice(0, MAX_SUBJECTS)) {
    const code = subject.code?.trim() ? normalizeCode(subject.code) : null;
    const credits = Number.isFinite(subject.credits)
      ? Math.min(60, Math.max(0, Math.trunc(subject.credits)))
      : 0;
    const semester =
      subject.semester !== null && Number.isFinite(subject.semester)
        ? Math.min(30, Math.max(1, Math.trunc(subject.semester)))
        : null;

    const parsed = extractedSubjectSchema.safeParse({
      code,
      name: String(subject.name ?? '').trim().slice(0, 300),
      credits,
      semester,
      is_elective: Boolean(subject.is_elective),
    });

    if (parsed.success) subjects.push(parsed.data);
  }

  const prerequisites: ExtractedPrerequisite[] = [];
  const seen = new Set<string>();

  for (const link of raw.prerequisites.slice(0, MAX_PREREQUISITES)) {
    const parsed = extractedPrerequisiteSchema.safeParse({
      subject_code: normalizeCode(String(link.subject_code ?? '')),
      prerequisite_code: normalizeCode(String(link.prerequisite_code ?? '')),
    });
    if (!parsed.success) continue;

    const key = `${parsed.data.subject_code}>${parsed.data.prerequisite_code}`;
    if (seen.has(key)) continue;
    seen.add(key);
    prerequisites.push(parsed.data);
  }

  return { subjects, prerequisites };
}

/** RF-024 — hallazgos que el estudiante debe resolver antes de confirmar */
export function detectInconsistencies(data: ExtractedData): Inconsistency[] {
  const found: Inconsistency[] = [];
  const codeCounts = new Map<string, number>();

  for (const subject of data.subjects) {
    if (subject.code) {
      codeCounts.set(subject.code, (codeCounts.get(subject.code) ?? 0) + 1);
    }
  }

  for (const [code, count] of codeCounts) {
    if (count > 1) {
      found.push({
        type: 'duplicate_code',
        message: `El código ${code} aparece ${count} veces`,
        subject_code: code,
        subject_name: null,
      });
    }
  }

  for (const subject of data.subjects) {
    if (!subject.code) {
      found.push({
        type: 'missing_code',
        message: `"${subject.name}" no tiene código; no podrá vincularse a requisitos`,
        subject_code: null,
        subject_name: subject.name,
      });
    }
    if (subject.credits === 0) {
      found.push({
        type: 'missing_credits',
        message: `"${subject.name}" no tiene créditos asignados`,
        subject_code: subject.code,
        subject_name: subject.name,
      });
    }
    if (subject.semester === null) {
      found.push({
        type: 'missing_semester',
        message: `"${subject.name}" no tiene semestre asignado`,
        subject_code: subject.code,
        subject_name: subject.name,
      });
    }
  }

  const knownCodes = new Set(
    data.subjects.map((subject) => subject.code).filter((code): code is string => code !== null),
  );

  for (const link of data.prerequisites) {
    if (link.subject_code === link.prerequisite_code) {
      found.push({
        type: 'self_prerequisite',
        message: `${link.subject_code} se declara requisito de sí misma`,
        subject_code: link.subject_code,
        subject_name: null,
      });
      continue;
    }
    if (!knownCodes.has(link.subject_code) || !knownCodes.has(link.prerequisite_code)) {
      found.push({
        type: 'unknown_prerequisite',
        message: `El requisito ${link.prerequisite_code} → ${link.subject_code} referencia una materia que no está en el plan`,
        subject_code: link.subject_code,
        subject_name: null,
      });
    }
  }

  return found;
}

function toImportDTO(row: Record<string, unknown>): CurriculumImportDTO {
  return {
    id: row.id as string,
    career_id: row.career_id as string,
    file_path: row.file_path as string,
    status: row.status as ImportStatus,
    extracted_data: (row.extracted_data as ExtractedData | null) ?? null,
    inconsistencies: (row.inconsistencies as Inconsistency[] | null) ?? [],
    error_message: (row.error_message as string | null) ?? null,
    reviewed_at: (row.reviewed_at as string | null) ?? null,
    created_at: (row.created_at as string | null) ?? null,
  };
}

export class CurriculumService {
  /**
   * RF-021–023 — Sube el PDF y lo procesa.
   * student_id sale del JWT; career_id se valida contra student_careers
   * (recurso ajeno ⇒ 404, nunca 403).
   */
  async importCurriculum(
    token: string,
    userId: string,
    careerId: string,
    buffer: Buffer,
  ): Promise<CurriculumImportDTO> {
    if (buffer.length === 0) {
      throw new ValidationError('El archivo está vacío');
    }
    if (buffer.length > MAX_CURRICULUM_PDF_BYTES) {
      throw new ValidationError('El plan de estudios no puede superar los 10MB');
    }
    if (!detectPdf(buffer)) {
      throw new ValidationError('El archivo debe ser un PDF válido');
    }

    const supabase = createUserClient(token);
    await this.assertCareerOwnership(supabase, userId, careerId);

    // Nombre generado server-side dentro del prefijo del usuario (SECURITY.md R3/§5.3)
    const objectPath = `${userId}/${randomUUID()}.pdf`;
    const filePath = `${CURRICULUM_BUCKET}/${objectPath}`;

    const { error: uploadError } = await supabase.storage
      .from(CURRICULUM_BUCKET)
      .upload(objectPath, buffer, { contentType: 'application/pdf', upsert: false });

    if (uploadError) {
      throw new AppError('No se pudo subir el plan de estudios', 500, 'STORAGE_ERROR');
    }

    const { data: created, error: insertError } = await supabase
      .from('curriculum_imports')
      .insert({
        student_id: userId,
        career_id: careerId,
        file_path: filePath,
        status: 'pending' satisfies ImportStatus,
      })
      .select(IMPORT_COLUMNS)
      .single();

    if (insertError || !created) {
      throw new AppError('No se pudo registrar la importación', 500, 'DB_ERROR');
    }

    const importId = created.id as string;
    const jobId = await this.createJob(supabase, userId, importId);

    // MVP: procesamiento en línea. El registro en processing_jobs deja la
    // puerta abierta a moverlo a un worker sin cambiar el contrato HTTP.
    return this.processImport(supabase, userId, importId, jobId, buffer);
  }

  async listImports(token: string, userId: string): Promise<CurriculumImportDTO[]> {
    const supabase = createUserClient(token);
    const { data, error } = await supabase
      .from('curriculum_imports')
      .select(IMPORT_COLUMNS)
      .eq('student_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new AppError('No se pudieron listar las importaciones', 500, 'DB_ERROR');
    return (data ?? []).map((row) => toImportDTO(row as Record<string, unknown>));
  }

  async getImport(token: string, userId: string, importId: string): Promise<CurriculumImportDTO> {
    const supabase = createUserClient(token);
    return toImportDTO(await this.findImportRow(supabase, userId, importId));
  }

  /** RF-024 — el estudiante corrige la extracción antes de confirmar */
  async updateImport(
    token: string,
    userId: string,
    importId: string,
    input: UpdateImportInput,
  ): Promise<CurriculumImportDTO> {
    const supabase = createUserClient(token);
    const existing = await this.findImportRow(supabase, userId, importId);

    if (existing.status === 'completed') {
      throw new ValidationError('La importación ya fue confirmada');
    }

    const data = sanitizeExtraction(input.extracted_data);
    const { data: updated, error } = await supabase
      .from('curriculum_imports')
      .update({
        extracted_data: data,
        inconsistencies: detectInconsistencies(data),
        status: 'review' satisfies ImportStatus,
        error_message: null,
      })
      .eq('id', importId)
      .eq('student_id', userId)
      .select(IMPORT_COLUMNS)
      .single();

    if (error || !updated) {
      throw new AppError('No se pudo actualizar la importación', 500, 'DB_ERROR');
    }
    return toImportDTO(updated as Record<string, unknown>);
  }

  async getInconsistencies(
    token: string,
    userId: string,
    importId: string,
  ): Promise<Inconsistency[]> {
    const supabase = createUserClient(token);
    const row = await this.findImportRow(supabase, userId, importId);
    return (row.inconsistencies as Inconsistency[] | null) ?? [];
  }

  /** RF-025, RF-026 — materializa materias y requisitos del plan revisado */
  async confirmImport(
    token: string,
    userId: string,
    importId: string,
  ): Promise<ConfirmImportResult> {
    const supabase = createUserClient(token);
    const existing = await this.findImportRow(supabase, userId, importId);

    if (existing.status === 'completed') {
      throw new ValidationError('La importación ya fue confirmada');
    }
    if (existing.status === 'failed') {
      throw new ValidationError('La importación falló; vuelve a subir el archivo');
    }

    const extracted = existing.extracted_data as ExtractedData | null;
    if (!extracted || extracted.subjects.length === 0) {
      throw new ValidationError('No hay materias extraídas para confirmar');
    }

    const careerId = existing.career_id as string;
    const { data: insertedSubjects, error: subjectsError } = await supabase
      .from('subjects')
      .insert(
        extracted.subjects.map((subject) => ({
          student_id: userId,
          career_id: careerId,
          code: subject.code,
          name: subject.name,
          credits: subject.credits,
          semester: subject.semester,
          is_elective: subject.is_elective,
          source: 'pdf_import',
        })),
      )
      .select('id, code');

    if (subjectsError || !insertedSubjects) {
      throw new AppError('No se pudieron crear las materias', 500, 'DB_ERROR');
    }

    const idByCode = new Map<string, string>();
    for (const row of insertedSubjects) {
      const code = (row as { code: string | null }).code;
      if (code) idByCode.set(code, (row as { id: string }).id);
    }

    const prerequisiteRows = extracted.prerequisites
      .map((link) => ({
        subjectId: idByCode.get(link.subject_code),
        prerequisiteId: idByCode.get(link.prerequisite_code),
      }))
      .filter(
        (link): link is { subjectId: string; prerequisiteId: string } =>
          link.subjectId !== undefined &&
          link.prerequisiteId !== undefined &&
          link.subjectId !== link.prerequisiteId,
      )
      .map((link) => ({
        student_id: userId,
        subject_id: link.subjectId,
        prerequisite_subject_id: link.prerequisiteId,
      }));

    if (prerequisiteRows.length > 0) {
      const { error: prerequisitesError } = await supabase
        .from('prerequisites')
        .insert(prerequisiteRows);
      if (prerequisitesError) {
        throw new AppError('No se pudieron crear los requisitos', 500, 'DB_ERROR');
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from('curriculum_imports')
      .update({
        status: 'completed' satisfies ImportStatus,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', importId)
      .eq('student_id', userId)
      .select(IMPORT_COLUMNS)
      .single();

    if (updateError || !updated) {
      throw new AppError('No se pudo confirmar la importación', 500, 'DB_ERROR');
    }

    return {
      import: toImportDTO(updated as Record<string, unknown>),
      created_subjects: insertedSubjects.length,
      created_prerequisites: prerequisiteRows.length,
    };
  }

  /** RF-027 — materias del estudiante */
  async listSubjects(token: string, userId: string, careerId?: string): Promise<SubjectDTO[]> {
    const supabase = createUserClient(token);
    let query = supabase.from('subjects').select(SUBJECT_COLUMNS).eq('student_id', userId);

    if (careerId) {
      query = query.eq('career_id', careerId);
    }

    const { data, error } = await query.order('semester', {
      ascending: true,
      nullsFirst: false,
    });

    if (error) throw new AppError('No se pudieron listar las materias', 500, 'DB_ERROR');
    return (data ?? []) as SubjectDTO[];
  }

  /** RF-026 — requisitos de una materia propia */
  async getPrerequisites(
    token: string,
    userId: string,
    subjectId: string,
  ): Promise<SubjectDTO[]> {
    const supabase = createUserClient(token);

    const { data: subject } = await supabase
      .from('subjects')
      .select('id')
      .eq('id', subjectId)
      .eq('student_id', userId)
      .maybeSingle();

    if (!subject) throw new NotFoundError('Materia no encontrada');

    const { data: links, error } = await supabase
      .from('prerequisites')
      .select('prerequisite_subject_id')
      .eq('subject_id', subjectId)
      .eq('student_id', userId);

    if (error) throw new AppError('No se pudieron obtener los requisitos', 500, 'DB_ERROR');

    const ids = (links ?? []).map((link) => (link as { prerequisite_subject_id: string }).prerequisite_subject_id);
    if (ids.length === 0) return [];

    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select(SUBJECT_COLUMNS)
      .eq('student_id', userId)
      .in('id', ids);

    if (subjectsError) {
      throw new AppError('No se pudieron obtener los requisitos', 500, 'DB_ERROR');
    }
    return (subjects ?? []) as SubjectDTO[];
  }

  private async assertCareerOwnership(
    supabase: SupabaseClient,
    userId: string,
    careerId: string,
  ): Promise<void> {
    const { data } = await supabase
      .from('student_careers')
      .select('career_id')
      .eq('student_id', userId)
      .eq('career_id', careerId)
      .maybeSingle();

    // Carrera ajena o inexistente ⇒ 404 para no filtrar existencia (SECURITY.md R1)
    if (!data) throw new NotFoundError('Carrera no encontrada');
  }

  private async findImportRow(
    supabase: SupabaseClient,
    userId: string,
    importId: string,
  ): Promise<Record<string, unknown>> {
    const { data, error } = await supabase
      .from('curriculum_imports')
      .select(IMPORT_COLUMNS)
      .eq('id', importId)
      .eq('student_id', userId)
      .maybeSingle();

    if (error) throw new AppError('No se pudo obtener la importación', 500, 'DB_ERROR');
    if (!data) throw new NotFoundError('Importación no encontrada');
    return data as Record<string, unknown>;
  }

  private async createJob(
    supabase: SupabaseClient,
    userId: string,
    importId: string,
  ): Promise<string | null> {
    const { data } = await supabase
      .from('processing_jobs')
      .insert({
        student_id: userId,
        job_type: IMPORT_JOB_TYPE,
        entity_type: IMPORT_ENTITY_TYPE,
        entity_id: importId,
        status: 'pending',
      })
      .select('id')
      .single();

    return (data as { id?: string } | null)?.id ?? null;
  }

  private async updateJob(
    supabase: SupabaseClient,
    userId: string,
    jobId: string | null,
    status: 'processing' | 'completed' | 'failed',
    errorMessage?: string,
  ): Promise<void> {
    if (!jobId) return;
    await supabase
      .from('processing_jobs')
      .update({ status, error_message: errorMessage ?? null })
      .eq('id', jobId)
      .eq('student_id', userId);
  }

  private async processImport(
    supabase: SupabaseClient,
    userId: string,
    importId: string,
    jobId: string | null,
    buffer: Buffer,
  ): Promise<CurriculumImportDTO> {
    await this.updateJob(supabase, userId, jobId, 'processing');
    await this.setImportStatus(supabase, userId, importId, 'processing');

    try {
      const text = extractTextFromPdf(buffer);
      const extraction = await getAIProvider().analyzeCurriculum(text);
      const data = sanitizeExtraction(extraction);

      const { data: updated, error } = await supabase
        .from('curriculum_imports')
        .update({
          extracted_data: data,
          inconsistencies: detectInconsistencies(data),
          status: 'review' satisfies ImportStatus,
          error_message: null,
        })
        .eq('id', importId)
        .eq('student_id', userId)
        .select(IMPORT_COLUMNS)
        .single();

      if (error || !updated) {
        throw new AppError('No se pudo guardar el análisis', 500, 'DB_ERROR');
      }

      await this.updateJob(supabase, userId, jobId, 'completed');
      return toImportDTO(updated as Record<string, unknown>);
    } catch {
      // Detalle solo en el registro del job; al cliente mensaje genérico
      await this.updateJob(supabase, userId, jobId, 'failed', 'PROCESSING_ERROR');
      const failed = await this.setImportStatus(
        supabase,
        userId,
        importId,
        'failed',
        'No se pudo procesar el PDF',
      );
      return failed;
    }
  }

  private async setImportStatus(
    supabase: SupabaseClient,
    userId: string,
    importId: string,
    status: ImportStatus,
    errorMessage?: string,
  ): Promise<CurriculumImportDTO> {
    const { data, error } = await supabase
      .from('curriculum_imports')
      .update({ status, error_message: errorMessage ?? null })
      .eq('id', importId)
      .eq('student_id', userId)
      .select(IMPORT_COLUMNS)
      .single();

    if (error || !data) {
      throw new AppError('No se pudo actualizar la importación', 500, 'DB_ERROR');
    }
    return toImportDTO(data as Record<string, unknown>);
  }
}

export const curriculumService = new CurriculumService();
