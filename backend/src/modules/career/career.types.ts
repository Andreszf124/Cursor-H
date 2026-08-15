import type { z } from 'zod';
import type {
  createInstitutionSchema,
  createPeriodSchema,
  setupCareerSchema,
  subjectStatusSchema,
} from './career.schemas.js';

export type CreateInstitutionInput = z.infer<typeof createInstitutionSchema>;
export type SetupCareerInput = z.infer<typeof setupCareerSchema>;
export type CreatePeriodInput = z.infer<typeof createPeriodSchema>;
export type SubjectStatusInput = z.infer<typeof subjectStatusSchema>;

export interface InstitutionDTO {
  id: string;
  name: string;
  country: string | null;
  is_verified: boolean;
}

export interface CareerDTO {
  id: string;
  institution_id: string;
  name: string;
  degree_level: string;
  total_credits: number | null;
}

export interface StudentCareerDTO {
  id: string;
  career: CareerDTO & { institution?: InstitutionDTO | null };
  is_active: boolean;
  started_at: string | null;
  expected_graduation: string | null;
}

export interface AcademicPeriodDTO {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface AcademicHistoryItemDTO {
  subject_id: string;
  code: string | null;
  name: string;
  credits: number;
  status: string;
  grade: string | null;
  completed_at: string | null;
}

export interface AcademicProgressDTO {
  total_subjects: number;
  approved: number;
  failed: number;
  in_progress: number;
  pending: number;
  completion_percentage: number;
  total_credits: number;
  earned_credits: number;
}
