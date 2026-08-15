import type { z } from 'zod';
import type {
  extractedDataSchema,
  extractedPrerequisiteSchema,
  extractedSubjectSchema,
  updateImportSchema,
} from './curriculum.schemas.js';

export type ExtractedSubject = z.infer<typeof extractedSubjectSchema>;
export type ExtractedPrerequisite = z.infer<typeof extractedPrerequisiteSchema>;
export type ExtractedData = z.infer<typeof extractedDataSchema>;
export type UpdateImportInput = z.infer<typeof updateImportSchema>;

export type ImportStatus = 'pending' | 'processing' | 'review' | 'completed' | 'failed';

export type InconsistencyType =
  | 'duplicate_code'
  | 'missing_code'
  | 'missing_credits'
  | 'missing_semester'
  | 'unknown_prerequisite'
  | 'self_prerequisite';

export interface Inconsistency {
  type: InconsistencyType;
  message: string;
  subject_code: string | null;
  subject_name: string | null;
}

export interface CurriculumImportDTO {
  id: string;
  career_id: string;
  file_path: string;
  status: ImportStatus;
  extracted_data: ExtractedData | null;
  inconsistencies: Inconsistency[];
  error_message: string | null;
  reviewed_at: string | null;
  created_at: string | null;
}

export interface ConfirmImportResult {
  import: CurriculumImportDTO;
  created_subjects: number;
  created_prerequisites: number;
}

export interface SubjectDTO {
  id: string;
  career_id: string;
  code: string | null;
  name: string;
  credits: number;
  semester: number | null;
  is_elective: boolean;
  source: string;
}
