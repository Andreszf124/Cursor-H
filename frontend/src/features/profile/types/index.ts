export interface LearningPreferences {
  learning_style: 'visual' | 'auditory' | 'kinesthetic' | 'mixed' | null;
  session_duration_minutes: number;
  difficulty_preference: 'adaptive' | 'easy' | 'challenging';
  techniques: string[];
  preferred_study_hours: Record<string, string[]> | null;
}

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  language: 'es' | 'en';
  timezone: string;
  onboarding_completed: boolean;
  learning_preferences: LearningPreferences | null;
}

export interface UpdateProfileInput {
  full_name?: string;
  language?: 'es' | 'en';
  timezone?: string;
}

export interface UpdatePreferencesInput {
  learning_style?: 'visual' | 'auditory' | 'kinesthetic' | 'mixed';
  session_duration_minutes?: number;
  difficulty_preference?: 'adaptive' | 'easy' | 'challenging';
  techniques?: string[];
}
