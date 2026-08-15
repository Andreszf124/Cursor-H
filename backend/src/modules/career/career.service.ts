import { createUserClient } from '../../infrastructure/database/supabase.client.js';
import { AppError, NotFoundError } from '../../shared/errors/app-error.js';
import type {
  AcademicHistoryItemDTO,
  AcademicPeriodDTO,
  AcademicProgressDTO,
  CreateInstitutionInput,
  CreatePeriodInput,
  InstitutionDTO,
  SetupCareerInput,
  StudentCareerDTO,
  SubjectStatusInput,
} from './career.types.js';

export class CareerService {
  /** RF-011 */
  async listInstitutions(token: string, search?: string): Promise<InstitutionDTO[]> {
    const supabase = createUserClient(token);
    let query = supabase
      .from('institutions')
      .select('id, name, country, is_verified')
      .order('name');

    if (search?.trim()) {
      query = query.ilike('name', `%${search.trim()}%`);
    }

    const { data, error } = await query;
    if (error) throw new AppError('No se pudieron listar instituciones', 500, 'DB_ERROR');
    return (data ?? []) as InstitutionDTO[];
  }

  /** RF-012 — created_by SIEMPRE del JWT */
  async createInstitution(
    token: string,
    userId: string,
    input: CreateInstitutionInput,
  ): Promise<InstitutionDTO> {
    const supabase = createUserClient(token);
    const { data, error } = await supabase
      .from('institutions')
      .insert({
        name: input.name,
        country: input.country ?? null,
        is_verified: false,
        created_by: userId,
      })
      .select('id, name, country, is_verified')
      .single();

    if (error || !data) {
      throw new AppError('No se pudo crear la institución', 500, 'DB_ERROR');
    }
    return data as InstitutionDTO;
  }

  /** RF-013 — carreras por institución */
  async listCareers(token: string, institutionId: string) {
    const supabase = createUserClient(token);
    const { data, error } = await supabase
      .from('careers')
      .select('id, institution_id, name, degree_level, total_credits')
      .eq('institution_id', institutionId)
      .order('name');

    if (error) throw new AppError('No se pudieron listar carreras', 500, 'DB_ERROR');
    return data ?? [];
  }

  /** RF-013, RF-014 — student_id del JWT */
  async setupCareer(
    token: string,
    userId: string,
    input: SetupCareerInput,
  ): Promise<StudentCareerDTO> {
    const supabase = createUserClient(token);

    const { data: institution } = await supabase
      .from('institutions')
      .select('id')
      .eq('id', input.institution_id)
      .maybeSingle();

    if (!institution) throw new NotFoundError('Institución no encontrada');

    let careerId: string;
    const { data: existing } = await supabase
      .from('careers')
      .select('id')
      .eq('institution_id', input.institution_id)
      .eq('name', input.career_name)
      .eq('degree_level', input.degree_level)
      .maybeSingle();

    if (existing) {
      careerId = existing.id as string;
    } else {
      const { data: created, error } = await supabase
        .from('careers')
        .insert({
          institution_id: input.institution_id,
          name: input.career_name,
          degree_level: input.degree_level,
        })
        .select('id')
        .single();
      if (error || !created) {
        throw new AppError('No se pudo crear la carrera', 500, 'DB_ERROR');
      }
      careerId = created.id as string;
    }

    // Desactivar otras carreras activas del estudiante
    await supabase
      .from('student_careers')
      .update({ is_active: false })
      .eq('student_id', userId)
      .eq('is_active', true);

    const { data: link, error: linkError } = await supabase
      .from('student_careers')
      .upsert(
        {
          student_id: userId,
          career_id: careerId,
          is_active: true,
          started_at: input.started_at ?? null,
          expected_graduation: input.expected_graduation ?? null,
        },
        { onConflict: 'student_id,career_id' },
      )
      .select(
        `
        id, is_active, started_at, expected_graduation,
        career:careers (
          id, institution_id, name, degree_level, total_credits,
          institution:institutions (id, name, country, is_verified)
        )
      `,
      )
      .single();

    if (linkError || !link) {
      throw new AppError('No se pudo asociar la carrera', 500, 'DB_ERROR');
    }

    return link as unknown as StudentCareerDTO;
  }

  async getActiveCareer(token: string, userId: string): Promise<StudentCareerDTO | null> {
    const supabase = createUserClient(token);
    const { data, error } = await supabase
      .from('student_careers')
      .select(
        `
        id, is_active, started_at, expected_graduation,
        career:careers (
          id, institution_id, name, degree_level, total_credits,
          institution:institutions (id, name, country, is_verified)
        )
      `,
      )
      .eq('student_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw new AppError('No se pudo obtener la carrera', 500, 'DB_ERROR');
    return (data as unknown as StudentCareerDTO) ?? null;
  }

  /** RF-015 */
  async createPeriod(
    token: string,
    userId: string,
    input: CreatePeriodInput,
  ): Promise<AcademicPeriodDTO> {
    const supabase = createUserClient(token);
    const { data, error } = await supabase
      .from('academic_periods')
      .insert({
        student_id: userId,
        name: input.name,
        start_date: input.start_date,
        end_date: input.end_date,
        is_active: input.activate ?? false,
      })
      .select('id, name, start_date, end_date, is_active')
      .single();

    if (error || !data) {
      throw new AppError('No se pudo crear el período', 500, 'DB_ERROR');
    }
    return data as AcademicPeriodDTO;
  }

  async listPeriods(token: string, userId: string): Promise<AcademicPeriodDTO[]> {
    const supabase = createUserClient(token);
    const { data, error } = await supabase
      .from('academic_periods')
      .select('id, name, start_date, end_date, is_active')
      .eq('student_id', userId)
      .order('start_date', { ascending: false });

    if (error) throw new AppError('No se pudieron listar períodos', 500, 'DB_ERROR');
    return (data ?? []) as AcademicPeriodDTO[];
  }

  /** RF-016 — solo períodos del JWT */
  async activatePeriod(token: string, userId: string, periodId: string): Promise<AcademicPeriodDTO> {
    const supabase = createUserClient(token);

    const { data: existing } = await supabase
      .from('academic_periods')
      .select('id')
      .eq('id', periodId)
      .eq('student_id', userId)
      .maybeSingle();

    if (!existing) throw new NotFoundError('Período no encontrado');

    const { data, error } = await supabase
      .from('academic_periods')
      .update({ is_active: true })
      .eq('id', periodId)
      .eq('student_id', userId)
      .select('id, name, start_date, end_date, is_active')
      .single();

    if (error || !data) {
      throw new AppError('No se pudo activar el período', 500, 'DB_ERROR');
    }
    return data as AcademicPeriodDTO;
  }

  /** RF-017 */
  async getHistory(token: string, userId: string): Promise<AcademicHistoryItemDTO[]> {
    const supabase = createUserClient(token);
    const { data: subjects, error } = await supabase
      .from('subjects')
      .select('id, code, name, credits')
      .eq('student_id', userId)
      .order('semester', { ascending: true, nullsFirst: false });

    if (error) throw new AppError('No se pudo obtener el historial', 500, 'DB_ERROR');

    const { data: statuses } = await supabase
      .from('student_subject_status')
      .select('subject_id, status, grade, completed_at')
      .eq('student_id', userId);

    const statusMap = new Map(
      (statuses ?? []).map((row) => [row.subject_id as string, row]),
    );

    return (subjects ?? []).map((subject) => {
      const status = statusMap.get(subject.id as string);
      return {
        subject_id: subject.id as string,
        code: (subject.code as string | null) ?? null,
        name: subject.name as string,
        credits: subject.credits as number,
        status: (status?.status as string) ?? 'pending',
        grade: (status?.grade as string | null) ?? null,
        completed_at: (status?.completed_at as string | null) ?? null,
      };
    });
  }

  /** RF-018, RF-019 — subject debe pertenecer al estudiante */
  async updateSubjectStatus(
    token: string,
    userId: string,
    subjectId: string,
    input: SubjectStatusInput,
  ) {
    const supabase = createUserClient(token);

    const { data: subject } = await supabase
      .from('subjects')
      .select('id')
      .eq('id', subjectId)
      .eq('student_id', userId)
      .maybeSingle();

    if (!subject) throw new NotFoundError('Materia no encontrada');

    if (input.academic_period_id) {
      const { data: period } = await supabase
        .from('academic_periods')
        .select('id')
        .eq('id', input.academic_period_id)
        .eq('student_id', userId)
        .maybeSingle();
      if (!period) throw new NotFoundError('Período no encontrado');
    }

    const { data, error } = await supabase
      .from('student_subject_status')
      .upsert(
        {
          student_id: userId,
          subject_id: subjectId,
          status: input.status,
          grade: input.grade ?? null,
          completed_at: input.completed_at ?? null,
          academic_period_id: input.academic_period_id ?? null,
        },
        { onConflict: 'student_id,subject_id' },
      )
      .select('subject_id, status, grade, completed_at, academic_period_id')
      .single();

    if (error || !data) {
      throw new AppError('No se pudo actualizar el estado', 500, 'DB_ERROR');
    }
    return data;
  }

  /** RF-020 */
  async calculateProgress(token: string, userId: string): Promise<AcademicProgressDTO> {
    const history = await this.getHistory(token, userId);
    const total = history.length;
    const approved = history.filter((item) => item.status === 'approved').length;
    const failed = history.filter((item) => item.status === 'failed').length;
    const inProgress = history.filter((item) => item.status === 'in_progress').length;
    const pending = history.filter((item) => item.status === 'pending').length;
    const totalCredits = history.reduce((sum, item) => sum + item.credits, 0);
    const earnedCredits = history
      .filter((item) => item.status === 'approved')
      .reduce((sum, item) => sum + item.credits, 0);

    return {
      total_subjects: total,
      approved,
      failed,
      in_progress: inProgress,
      pending,
      completion_percentage: total === 0 ? 0 : Math.round((approved / total) * 10000) / 100,
      total_credits: totalCredits,
      earned_credits: earnedCredits,
    };
  }
}

export const careerService = new CareerService();
