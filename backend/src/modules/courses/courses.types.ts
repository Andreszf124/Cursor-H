import type { z } from 'zod';
import type {
  createClassroomSchema,
  createCourseSchema,
  createProfessorSchema,
  updateClassroomSchema,
  updateCourseSchema,
  updateProfessorSchema,
} from './courses.schemas.js';

export type CreateProfessorInput = z.infer<typeof createProfessorSchema>;
export type UpdateProfessorInput = z.infer<typeof updateProfessorSchema>;
export type CreateClassroomInput = z.infer<typeof createClassroomSchema>;
export type UpdateClassroomInput = z.infer<typeof updateClassroomSchema>;
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;

export type CourseModality = 'in_person' | 'virtual' | 'hybrid';

export interface ProfessorDTO {
  id: string;
  name: string;
  email: string | null;
}

export interface ClassroomDTO {
  id: string;
  name: string;
  location: string | null;
  virtual_url: string | null;
}

export interface CourseDTO {
  id: string;
  name: string;
  academic_period_id: string;
  subject_id: string | null;
  professor_id: string | null;
  modality: CourseModality;
  color: string | null;
  professor: ProfessorDTO | null;
}
