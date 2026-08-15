import { apiFetch } from '../../../services/api/client';
import type { Profile } from '../../profile/types';
import type { ImportedCourse } from '../components/CourseImportPreview';

export const onboardingService = {
  complete(): Promise<Profile> {
    return apiFetch<Profile>('/api/v1/onboarding/complete', { method: 'POST' });
  },
  teamsAuthUrl(): Promise<{ available: boolean; auth_url?: string }> {
    return apiFetch('/api/v1/integrations/teams/auth-url');
  },
  teamsCallback(code: string): Promise<unknown> {
    return apiFetch('/api/v1/integrations/teams/callback', { method: 'POST', body: { code } });
  },
  teamsCourses(): Promise<{ demo: boolean; courses: ImportedCourse[] }> {
    return apiFetch('/api/v1/integrations/teams/courses');
  },
  campusImport(): Promise<{
    imported: number;
    demo: boolean;
    courses: ImportedCourse[];
    warnings: string[];
  }> {
    return apiFetch('/api/v1/integrations/campus/import', { method: 'POST', body: {} });
  },
};
