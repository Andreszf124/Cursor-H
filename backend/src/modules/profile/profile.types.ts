import type { z } from 'zod';
import type {
  learningPreferencesSchema,
  updatePreferencesSchema,
  updateProfileSchema,
} from './profile.schemas.js';

export type LearningPreferencesInput = z.infer<typeof learningPreferencesSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export interface LearningPreferencesDTO {
  learning_style: string | null;
  session_duration_minutes: number;
  difficulty_preference: string;
  techniques: string[];
  preferred_study_hours: Record<string, string[]> | null;
}

export interface ProfileDTO {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  language: string;
  timezone: string;
  onboarding_completed: boolean;
  learning_preferences: LearningPreferencesDTO | null;
}

export interface AvatarUploadResult {
  avatar_url: string;
}
