import { z } from 'zod';

export const importCurriculumSchema = z.object({
  career_id: z.uuid(),
});

/** Alias compat */
export const importMetaSchema = importCurriculumSchema;

export const extractedSubjectSchema = z.object({
  code: z.string().trim().min(1).max(50).nullable(),
  name: z.string().trim().min(1).max(300),
  credits: z.number().int().min(0).max(60),
  semester: z.number().int().min(1).max(30).nullable(),
  is_elective: z.boolean(),
});

export const extractedPrerequisiteSchema = z.object({
  subject_code: z.string().trim().min(1).max(50),
  prerequisite_code: z.string().trim().min(1).max(50),
});

export const extractedDataSchema = z.object({
  subjects: z.array(extractedSubjectSchema).max(500),
  prerequisites: z.array(extractedPrerequisiteSchema).max(2000),
});

export const updateImportSchema = z.object({
  extracted_data: extractedDataSchema,
});

/** Alias compat */
export const patchImportSchema = updateImportSchema.partial().extend({
  inconsistencies: z.array(z.record(z.string(), z.unknown())).optional(),
});

export const listSubjectsQuerySchema = z.object({
  career_id: z.uuid().optional(),
});

export const uuidParamSchema = z.object({
  id: z.uuid(),
});
