import { z } from 'zod';

export const MATERIAL_CATEGORIES = [
  'slides',
  'notes',
  'exam',
  'book',
  'video',
  'link',
  'other',
] as const;

export const uploadMaterialSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  course_id: z.uuid().optional(),
  category: z.enum(MATERIAL_CATEGORIES).default('other'),
});

export const updateMaterialSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    course_id: z.uuid().nullable().optional(),
    category: z.enum(MATERIAL_CATEGORIES).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Nada que actualizar',
  });

export const searchMaterialsSchema = z.object({
  q: z.string().trim().min(1).max(200),
  category: z.enum(MATERIAL_CATEGORIES).optional(),
  course_id: z.uuid().optional(),
});

export const listMaterialsSchema = z.object({
  category: z.enum(MATERIAL_CATEGORIES).optional(),
  course_id: z.uuid().optional(),
});

export const uuidParamSchema = z.object({ id: z.uuid() });
