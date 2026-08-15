import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../test/utils';
import { useAuthStore } from '../../../stores/authStore';
import { OnboardingWizard } from './OnboardingWizard';

const mocks = vi.hoisted(() => ({
  teamsCallback: vi.fn(),
  teamsCourses: vi.fn(),
  complete: vi.fn(),
  ensureActivePeriod: vi.fn(),
  updatePreferences: vi.fn(),
  getProfile: vi.fn(),
  createCourse: vi.fn(),
  createSchedule: vi.fn(),
  uploadMaterial: vi.fn(),
}));

vi.mock('../services/onboardingService', () => ({
  onboardingService: {
    teamsCallback: mocks.teamsCallback,
    teamsCourses: mocks.teamsCourses,
    complete: mocks.complete,
  },
}));

vi.mock('../../career/services/careerService', () => ({
  careerService: {
    ensureActivePeriod: mocks.ensureActivePeriod,
  },
}));

vi.mock('../../profile/services/profileService', () => ({
  profileService: {
    getProfile: mocks.getProfile,
    updatePreferences: mocks.updatePreferences,
  },
}));

vi.mock('../../courses/services/coursesService', () => ({
  coursesService: {
    createCourse: mocks.createCourse,
  },
}));

vi.mock('../../learning/services/learningService', () => ({
  materialsService: {
    upload: mocks.uploadMaterial,
  },
}));

vi.mock('../../schedule/services/scheduleService', () => ({
  scheduleService: {
    createSchedule: mocks.createSchedule,
  },
}));

describe('OnboardingWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().setAuth(
      { id: 'user-1', email: 'ana@universidad.edu' },
      { access_token: 'a', refresh_token: 'r' },
    );
    mocks.getProfile.mockResolvedValue({ onboarding_completed: false });
    mocks.ensureActivePeriod.mockResolvedValue({ id: 'period-1' });
    mocks.updatePreferences.mockResolvedValue({ preferences: {} });
    mocks.createCourse.mockResolvedValue({ id: 'course-1', name: 'Cálculo I' });
    mocks.createSchedule.mockResolvedValue({ id: 'sched-1' });
    mocks.complete.mockResolvedValue({ onboarding_completed: true });
  });

  it('empieza por los cursos y no pide universidad, fechas ni contraseña', () => {
    renderWithProviders(<OnboardingWizard />);
    expect(screen.getByRole('heading', { name: 'Tus cursos' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/universidad/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/fecha/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/contraseña/i)).not.toBeInTheDocument();
  });

  it('guarda un curso con días y horario', async () => {
    renderWithProviders(<OnboardingWizard />);
    fireEvent.input(screen.getByLabelText('Nombre del curso'), { target: { value: 'Cálculo I' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lun' }));
    fireEvent.change(screen.getByLabelText('Hora de inicio'), { target: { value: '08:00' } });
    fireEvent.change(screen.getByLabelText('Hora de fin'), { target: { value: '10:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar curso' }));
    expect(screen.getByText('Cálculo I')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cursos' }));

    await waitFor(() => {
      expect(mocks.createCourse).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Cálculo I', academic_period_id: 'period-1' }),
      );
    });
    expect(mocks.createSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        course_id: 'course-1',
        day_of_week: 1,
        start_time: '08:00',
        end_time: '10:00',
        recurrence: 'weekly',
      }),
    );
    expect(await screen.findByRole('heading', { name: 'Cómo prefieres estudiar' })).toBeInTheDocument();
  });
});
