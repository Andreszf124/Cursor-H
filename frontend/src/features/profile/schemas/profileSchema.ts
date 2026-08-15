import { z } from 'zod';

export const profileSchema = z.object({
  full_name: z.string().trim().min(1, 'El nombre es requerido').max(120),
  language: z.enum(['es', 'en']),
  timezone: z.string().trim().min(1, 'La zona horaria es requerida').max(60),
});

export const preferencesSchema = z.object({
  learning_style: z.enum(['visual', 'auditory', 'kinesthetic', 'mixed']),
  session_duration_minutes: z.coerce
    .number<number>()
    .int()
    .min(10, 'Mínimo 10 minutos')
    .max(240, 'Máximo 240 minutos'),
  difficulty_preference: z.enum(['adaptive', 'easy', 'challenging']),
  techniques: z.array(z.string()).max(20),
});

export type ProfileFormInput = z.infer<typeof profileSchema>;
export type PreferencesFormInput = z.infer<typeof preferencesSchema>;

/** Validación client-side del avatar (el backend re-valida con magic bytes) */
export const AVATAR_MAX_SIZE_BYTES = 2 * 1024 * 1024;
export const AVATAR_ALLOWED_TYPES = ['image/jpeg', 'image/png'];

export function validateAvatarFile(file: File): string | null {
  if (!AVATAR_ALLOWED_TYPES.includes(file.type)) {
    return 'Solo se permiten imágenes JPEG o PNG';
  }
  if (file.size > AVATAR_MAX_SIZE_BYTES) {
    return 'La imagen no puede superar los 2MB';
  }
  return null;
}
