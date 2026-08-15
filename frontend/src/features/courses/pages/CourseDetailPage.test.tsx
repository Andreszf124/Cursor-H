import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { ApiError } from '../../../services/api/client';
import { CourseDetailPage } from './CourseDetailPage';

vi.mock('../services/coursesService', () => ({
  coursesService: { getCourse: vi.fn() },
}));

vi.mock('../../schedule/services/scheduleService', () => ({
  scheduleService: {
    listSchedules: vi.fn(),
    getWeek: vi.fn(),
    createSchedule: vi.fn(),
    deleteSchedule: vi.fn(),
  },
}));

vi.mock('../../learning/services/learningService', () => ({
  knowledgeService: { listConcepts: vi.fn(), prioritizedGaps: vi.fn() },
  materialsService: {
    listByCourse: vi.fn(),
    upload: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    signedUrl: vi.fn(),
  },
  practiceService: { list: vi.fn(), generate: vi.fn() },
  checkinsService: { listByCourse: vi.fn() },
  resourcesService: { list: vi.fn() },
  resourceTopics: () => [],
  MATERIAL_LABELS: { slides: 'Presentación', other: 'Material' },
  PRACTICE_STATUS: { pending: 'Pendiente', completed: 'Completada' },
}));

vi.mock('../../progress/services/progressService', () => ({
  progressService: { byConcept: vi.fn() },
}));

import { knowledgeService, materialsService, practiceService, checkinsService, resourcesService } from '../../learning/services/learningService';
import { progressService } from '../../progress/services/progressService';
import { scheduleService } from '../../schedule/services/scheduleService';
import { coursesService } from '../services/coursesService';

function renderCourse(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/courses/:courseId" element={<CourseDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CourseDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(scheduleService.listSchedules).mockResolvedValue({ schedules: [] });
    vi.mocked(scheduleService.getWeek).mockResolvedValue({
      week_start: '2026-08-10',
      week_end: '2026-08-16',
      schedules: [],
    });
    vi.mocked(knowledgeService.listConcepts).mockResolvedValue({ concepts: [] });
    vi.mocked(knowledgeService.prioritizedGaps).mockResolvedValue({ gaps: [] });
    vi.mocked(materialsService.listByCourse).mockResolvedValue({ materials: [] });
    vi.mocked(practiceService.list).mockResolvedValue({ practices: [] });
    vi.mocked(checkinsService.listByCourse).mockResolvedValue({ checkins: [] });
    vi.mocked(resourcesService.list).mockResolvedValue({ resources: [] });
    vi.mocked(progressService.byConcept).mockResolvedValue({ concepts: [] });
  });

  it('muestra 404 amigable si el curso no pertenece al estudiante', async () => {
    vi.mocked(coursesService.getCourse).mockRejectedValue(new ApiError(404, 'Curso no encontrado'));
    renderCourse('/courses/00000000-0000-4000-8000-0000000000f9');
    expect(await screen.findByText('No encontrado')).toBeInTheDocument();
    expect(screen.queryByText(/Curso no encontrado/)).not.toBeInTheDocument();
  });

  it('muestra el hub del curso con pestañas de aprendizaje', async () => {
    vi.mocked(coursesService.getCourse).mockResolvedValue({
      id: 'c1',
      name: 'Cálculo I',
      academic_period_id: 'p1',
      subject_id: null,
      professor_id: 'pr1',
      modality: 'in_person',
      color: null,
      professor: { id: 'pr1', name: 'Carlos Rodríguez', email: null },
    });
    renderCourse('/courses/c1');
    expect(await screen.findByRole('heading', { name: 'Cálculo I' })).toBeInTheDocument();
    expect(screen.getByText('Carlos Rodríguez')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Resumen' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Clases' })).toBeInTheDocument();
    expect(screen.getByText('Lo que estás aprendiendo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Agregar o editar documentos' })).toHaveAttribute(
      'href',
      '/courses/c1?tab=materiales',
    );
    expect(screen.getByRole('link', { name: 'Agregar horario' })).toHaveAttribute(
      'href',
      '/courses/c1?tab=clases',
    );
  });

  it('en Clases permite cargar días y horario semanal', async () => {
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
    renderCourse('/courses/c1?tab=clases');
    expect(await screen.findByText('Horario semanal')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lun' })).toBeInTheDocument();
    expect(screen.getByLabelText('Hora de inicio')).toBeInTheDocument();
    expect(screen.getByLabelText('Hora de fin')).toBeInTheDocument();
  });
});
