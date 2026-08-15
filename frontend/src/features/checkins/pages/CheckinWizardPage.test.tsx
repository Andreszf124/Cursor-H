import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { CheckinWizardPage } from './CheckinWizardPage';

vi.mock('../../courses/services/coursesService', () => ({
  coursesService: { getCourse: vi.fn() },
}));

vi.mock('../../learning/services/learningService', () => ({
  checkinsService: {
    listByCourse: vi.fn(),
    create: vi.fn(),
    get: vi.fn(),
    recordTopics: vi.fn(),
    recordComprehension: vi.fn(),
    complete: vi.fn(),
  },
}));

import { coursesService } from '../../courses/services/coursesService';
import { checkinsService } from '../../learning/services/learningService';

function renderWizard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/courses/c1/checkin?date=2026-08-15']}>
        <Routes>
          <Route path="/courses/:courseId/checkin" element={<CheckinWizardPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CheckinWizardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(coursesService.getCourse).mockResolvedValue({
      id: 'c1',
      name: 'Cálculo I',
      academic_period_id: 'p1',
      subject_id: null,
      professor_id: null,
      modality: 'in_person',
      color: null,
      professor: null,
    });
    vi.mocked(checkinsService.listByCourse).mockResolvedValue({ checkins: [] });
  });

  it('empieza preguntando cómo te fue, no con un formulario técnico', async () => {
    renderWizard();
    expect(await screen.findByRole('heading', { name: /¿Cómo te fue en Cálculo I/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Empezar check-in' })).toBeInTheDocument();
    expect(screen.queryByText(/student_id/)).not.toBeInTheDocument();
  });

  it('pide temas después de crear el check-in', async () => {
    vi.mocked(checkinsService.create).mockResolvedValue({
      id: 'ck1',
      course_id: 'c1',
      schedule_id: null,
      class_date: '2026-08-15',
      status: 'pending',
      comprehension_level: null,
      difficulties: null,
    });
    vi.mocked(checkinsService.get).mockResolvedValue({
      id: 'ck1',
      course_id: 'c1',
      schedule_id: null,
      class_date: '2026-08-15',
      status: 'pending',
      comprehension_level: null,
      difficulties: null,
      topics: [],
      suggestions: ['Integral definida'],
    });
    renderWizard();
    fireEvent.click(await screen.findByRole('button', { name: 'Empezar check-in' }));
    expect(await screen.findByText('¿Qué vieron hoy?')).toBeInTheDocument();
    expect(await screen.findByText('Integral definida')).toBeInTheDocument();
  });

  it('si la clase ya tiene check-in, no vuelve a pedir el formulario', async () => {
    vi.mocked(checkinsService.listByCourse).mockResolvedValue({
      checkins: [
        {
          id: 'ck1',
          course_id: 'c1',
          schedule_id: null,
          class_date: '2026-08-15',
          status: 'completed',
          comprehension_level: 4,
          difficulties: null,
        },
      ],
    });
    renderWizard();
    expect(await screen.findByText('Ya registraste cómo te fue en esta clase.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Empezar check-in' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Hacer práctica' })).toHaveAttribute(
      'href',
      '/courses/c1?tab=practica',
    );
  });
});
