import type { SupabaseClient } from '@supabase/supabase-js';
import { createUserClient } from '../../infrastructure/database/supabase.client.js';
import { AppError, NotFoundError } from '../../shared/errors/app-error.js';
import { assertOwnedRow } from '../../shared/utils/ownership.js';
import type {
  ClassroomDTO,
  CourseDTO,
  CreateClassroomInput,
  CreateCourseInput,
  CreateProfessorInput,
  ProfessorDTO,
  UpdateClassroomInput,
  UpdateCourseInput,
  UpdateProfessorInput,
} from './courses.types.js';

const COURSE_COLUMNS =
  'id, name, academic_period_id, subject_id, professor_id, modality, color';
const PROFESSOR_COLUMNS = 'id, name, email';
const CLASSROOM_COLUMNS = 'id, name, location, virtual_url';

type CourseRow = Omit<CourseDTO, 'professor'>;

/**
 * student_id se fija siempre desde el JWT y las referencias (período, materia,
 * profesor) se validan como propias antes de escribir (SECURITY.md R1).
 */
export class CoursesService {
  /** RF-034 */
  async listProfessors(token: string, userId: string): Promise<ProfessorDTO[]> {
    const supabase = createUserClient(token);
    const { data, error } = await supabase
      .from('professors')
      .select(PROFESSOR_COLUMNS)
      .eq('student_id', userId)
      .order('name');

    if (error) throw new AppError('No se pudieron listar los profesores', 500, 'DB_ERROR');
    return (data ?? []) as ProfessorDTO[];
  }

  async createProfessor(
    token: string,
    userId: string,
    input: CreateProfessorInput,
  ): Promise<ProfessorDTO> {
    const supabase = createUserClient(token);
    const { data, error } = await supabase
      .from('professors')
      .insert({ student_id: userId, name: input.name, email: input.email ?? null })
      .select(PROFESSOR_COLUMNS)
      .single();

    if (error || !data) throw new AppError('No se pudo crear el profesor', 500, 'DB_ERROR');
    return data as ProfessorDTO;
  }

  async updateProfessor(
    token: string,
    userId: string,
    professorId: string,
    input: UpdateProfessorInput,
  ): Promise<ProfessorDTO> {
    const supabase = createUserClient(token);
    await assertOwnedRow(supabase, 'professors', professorId, userId, 'Profesor no encontrado');

    const { data, error } = await supabase
      .from('professors')
      .update(input)
      .eq('id', professorId)
      .eq('student_id', userId)
      .select(PROFESSOR_COLUMNS)
      .single();

    if (error || !data) throw new AppError('No se pudo actualizar el profesor', 500, 'DB_ERROR');
    return data as ProfessorDTO;
  }

  async deleteProfessor(token: string, userId: string, professorId: string): Promise<void> {
    const supabase = createUserClient(token);
    await assertOwnedRow(supabase, 'professors', professorId, userId, 'Profesor no encontrado');
    const { error } = await supabase
      .from('professors')
      .delete()
      .eq('id', professorId)
      .eq('student_id', userId);

    if (error) throw new AppError('No se pudo eliminar el profesor', 500, 'DB_ERROR');
  }

  /** RF-036 */
  async listClassrooms(token: string, userId: string): Promise<ClassroomDTO[]> {
    const supabase = createUserClient(token);
    const { data, error } = await supabase
      .from('classrooms')
      .select(CLASSROOM_COLUMNS)
      .eq('student_id', userId)
      .order('name');

    if (error) throw new AppError('No se pudieron listar las aulas', 500, 'DB_ERROR');
    return (data ?? []) as ClassroomDTO[];
  }

  async createClassroom(
    token: string,
    userId: string,
    input: CreateClassroomInput,
  ): Promise<ClassroomDTO> {
    const supabase = createUserClient(token);
    const { data, error } = await supabase
      .from('classrooms')
      .insert({
        student_id: userId,
        name: input.name,
        location: input.location ?? null,
        virtual_url: input.virtual_url ?? null,
      })
      .select(CLASSROOM_COLUMNS)
      .single();

    if (error || !data) throw new AppError('No se pudo crear el aula', 500, 'DB_ERROR');
    return data as ClassroomDTO;
  }

  async updateClassroom(
    token: string,
    userId: string,
    classroomId: string,
    input: UpdateClassroomInput,
  ): Promise<ClassroomDTO> {
    const supabase = createUserClient(token);
    await assertOwnedRow(supabase, 'classrooms', classroomId, userId, 'Aula no encontrada');

    const { data, error } = await supabase
      .from('classrooms')
      .update(input)
      .eq('id', classroomId)
      .eq('student_id', userId)
      .select(CLASSROOM_COLUMNS)
      .single();

    if (error || !data) throw new AppError('No se pudo actualizar el aula', 500, 'DB_ERROR');
    return data as ClassroomDTO;
  }

  async deleteClassroom(token: string, userId: string, classroomId: string): Promise<void> {
    const supabase = createUserClient(token);
    await assertOwnedRow(supabase, 'classrooms', classroomId, userId, 'Aula no encontrada');
    const { error } = await supabase
      .from('classrooms')
      .delete()
      .eq('id', classroomId)
      .eq('student_id', userId);

    if (error) throw new AppError('No se pudo eliminar el aula', 500, 'DB_ERROR');
  }

  /** RF-031, RF-032 */
  async listCourses(token: string, userId: string, periodId?: string): Promise<CourseDTO[]> {
    const supabase = createUserClient(token);
    let query = supabase.from('courses').select(COURSE_COLUMNS).eq('student_id', userId);

    if (periodId) {
      query = query.eq('academic_period_id', periodId);
    }

    const { data, error } = await query.order('name');
    if (error) throw new AppError('No se pudieron listar los cursos', 500, 'DB_ERROR');
    return this.withProfessor(supabase, userId, (data ?? []) as CourseRow[]);
  }

  async getCourse(token: string, userId: string, courseId: string): Promise<CourseDTO> {
    const supabase = createUserClient(token);
    const { data, error } = await supabase
      .from('courses')
      .select(COURSE_COLUMNS)
      .eq('id', courseId)
      .eq('student_id', userId)
      .maybeSingle();

    if (error) throw new AppError('No se pudo obtener el curso', 500, 'DB_ERROR');
    if (!data) throw new NotFoundError('Curso no encontrado');
    const [course] = await this.withProfessor(supabase, userId, [data as CourseRow]);
    if (!course) throw new NotFoundError('Curso no encontrado');
    return course;
  }

  async createCourse(
    token: string,
    userId: string,
    input: CreateCourseInput,
  ): Promise<CourseDTO> {
    const supabase = createUserClient(token);
    await this.assertReferences(supabase, userId, input);

    const { data, error } = await supabase
      .from('courses')
      .insert({
        student_id: userId,
        name: input.name,
        academic_period_id: input.academic_period_id,
        subject_id: input.subject_id ?? null,
        professor_id: input.professor_id ?? null,
        modality: input.modality,
        color: input.color ?? null,
      })
      .select(COURSE_COLUMNS)
      .single();

    if (error || !data) throw new AppError('No se pudo crear el curso', 500, 'DB_ERROR');
    const [course] = await this.withProfessor(supabase, userId, [data as CourseRow]);
    if (!course) throw new AppError('No se pudo crear el curso', 500, 'DB_ERROR');
    return course;
  }

  async updateCourse(
    token: string,
    userId: string,
    courseId: string,
    input: UpdateCourseInput,
  ): Promise<CourseDTO> {
    const supabase = createUserClient(token);
    await assertOwnedRow(supabase, 'courses', courseId, userId, 'Curso no encontrado');
    await this.assertReferences(supabase, userId, input);

    const { data, error } = await supabase
      .from('courses')
      .update(input)
      .eq('id', courseId)
      .eq('student_id', userId)
      .select(COURSE_COLUMNS)
      .single();

    if (error || !data) throw new AppError('No se pudo actualizar el curso', 500, 'DB_ERROR');
    const [course] = await this.withProfessor(supabase, userId, [data as CourseRow]);
    if (!course) throw new AppError('No se pudo actualizar el curso', 500, 'DB_ERROR');
    return course;
  }

  /** RF-035 */
  async deleteCourse(token: string, userId: string, courseId: string): Promise<void> {
    const supabase = createUserClient(token);
    await assertOwnedRow(supabase, 'courses', courseId, userId, 'Curso no encontrado');
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId)
      .eq('student_id', userId);

    if (error) throw new AppError('No se pudo eliminar el curso', 500, 'DB_ERROR');
  }

  private async assertReferences(
    supabase: SupabaseClient,
    userId: string,
    input: UpdateCourseInput,
  ): Promise<void> {
    if (input.academic_period_id) {
      await assertOwnedRow(
        supabase,
        'academic_periods',
        input.academic_period_id,
        userId,
        'Período no encontrado',
      );
    }
    if (input.subject_id) {
      await assertOwnedRow(supabase, 'subjects', input.subject_id, userId, 'Materia no encontrada');
    }
    if (input.professor_id) {
      await assertOwnedRow(
        supabase,
        'professors',
        input.professor_id,
        userId,
        'Profesor no encontrado',
      );
    }
  }

  /**
   * El profesor se adjunta en una consulta aparte (mismo patrón que horarios):
   * RLS sigue filtrando por student_id y el fake de tests no resuelve embeds.
   */
  private async withProfessor(
    supabase: SupabaseClient,
    userId: string,
    rows: CourseRow[],
  ): Promise<CourseDTO[]> {
    if (rows.length === 0) return [];

    const { data: professors } = await supabase
      .from('professors')
      .select(PROFESSOR_COLUMNS)
      .eq('student_id', userId);

    const professorById = new Map(
      ((professors ?? []) as ProfessorDTO[]).map((professor) => [professor.id, professor]),
    );

    return rows.map((row) => ({
      ...row,
      professor: row.professor_id ? (professorById.get(row.professor_id) ?? null) : null,
    }));
  }
}

export const coursesService = new CoursesService();
