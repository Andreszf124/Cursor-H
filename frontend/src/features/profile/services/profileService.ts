import { apiFetch } from '../../../services/api/client';
import type {
  LearningPreferences,
  Profile,
  UpdatePreferencesInput,
  UpdateProfileInput,
} from '../types';

export const profileService = {
  getProfile(): Promise<Profile> {
    return apiFetch<Profile>('/api/v1/profile');
  },

  updateProfile(input: UpdateProfileInput): Promise<Profile> {
    return apiFetch<Profile>('/api/v1/profile', { method: 'PATCH', body: input });
  },

  uploadAvatar(file: File): Promise<{ avatar_url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch<{ avatar_url: string }>('/api/v1/profile/avatar', {
      method: 'POST',
      formData,
    });
  },

  deleteAvatar(): Promise<void> {
    return apiFetch<void>('/api/v1/profile/avatar', { method: 'DELETE' });
  },

  getPreferences(): Promise<{ preferences: LearningPreferences | null }> {
    return apiFetch<{ preferences: LearningPreferences | null }>('/api/v1/profile/preferences');
  },

  updatePreferences(
    input: UpdatePreferencesInput,
  ): Promise<{ preferences: LearningPreferences | null }> {
    return apiFetch<{ preferences: LearningPreferences | null }>('/api/v1/profile/preferences', {
      method: 'PATCH',
      body: input,
    });
  },
};
