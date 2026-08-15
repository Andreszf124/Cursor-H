import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../test/utils';
import { CoursesPage } from './CoursesPage';

vi.mock('../../career/services/careerService', () => ({
  careerService: {
    listPeriods: vi.fn(),
    ensureActivePeriod: vi.fn(),
  },
}));

vi.mock('../services/coursesService', () => ({
  coursesService: {
    listCourses: vi.fn(),
    createCourse: vi.fn(),
  },
}));

vi.mock('../../schedule/services/scheduleService', () => ({
  scheduleService: {
    listSchedules: vi.fn(),
    createSchedule: vi.fn(),
  },
}));

vi.mock('../../progress/services/progressService', () => ({
  progressService: {
    byConcept: vi.fn(),
  },
}));

vi.mock('../../learning/services/learningService', () => ({
  materialsService: { upload: vi.fn() },
  MATERIAL_LABELS: { other: 'Material' },
}));

import { careerService } from '../../career/services/careerService';
import { progressService } from '../../progress/services/progressService';
import { scheduleService } from '../../schedule/services/scheduleService';
import { coursesService } from '../services/coursesService';

const listPeriods = vi.mocked(careerService.listPeriods);
const ensureActivePeriod = vi.mocked(careerService.ensureActivePeriod);
const listCourses = vi.mocked(coursesService.listCourses);
const createCourse = vi.mocked(coursesService.createCourse);
const listSchedules = vi.mocked(scheduleService.listSchedules);
const createSchedule = vi.mocked(scheduleService.createSchedule);
const byConcept = vi.mocked(progressService.byConcept);

function fillWeeklySchedule() {
  fireEvent.click(screen.getByRole('button', { name: 'Lun' }));
  fireEvent.change(screen.getByLabelText('Hora de inicio'), { target: { value: '08:00' } });
  fireEvent.change(screen.getByLabelText('Hora de fin'), { target: { value: '10:00' } });
}

describe('CoursesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listPeriods.mockResolvedValue({
      periods: [{ id: 'p1', name: '2026-II', start_date: '2026-07-01', end_date: '2026-12-01', is_active: true }],
    });
    ensureActivePeriod.mockResolvedValue({
      id: 'p1',
      name: '2026-II',
      start_date: '2026-07-01',
      end_date: '2026-12-01',
      is_active: true,
    });
    listSchedules.mockResolvedValue({ schedules: [] });
    createSchedule.mockResolvedValue({
      id: 's1',
      course_id: 'c2',
      classroom_id: null,
      day_of_week: 1,
      start_time: '08:00',
      end_time: '10:00',
      recurrence: 'weekly',
      valid_from: null,
      valid_until: null,
      course: null,
      classroom: null,
    });
    byConcept.mockResolvedValue({ concepts: [] });
    createCourse.mockResolvedValue({
      id: 'c2',
      name: 'Álgebra',
      academic_period_id: 'p1',
      subject_id: null,
      professor_id: null,
      modality: 'in_person',
      color: '#0F766E',
      professor: null,
    });
  });

  it('permite agregar un curso con días y horario, sin universidad ni fechas de semestre', async () => {
    listCourses.mockResolvedValue({ courses: [] });
    renderWithProviders(<CoursesPage />);
    expect(await screen.findByLabelText('Nombre del curso')).toBeInTheDocument();
    expect(screen.getByLabelText('Hora de inicio')).toBeInTheDocument();
    expect(screen.getByLabelText('Hora de fin')).toBeInTheDocument();
    expect(screen.queryByLabelText(/universidad/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/fecha/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Configurar carrera')).not.toBeInTheDocument();

    fireEvent.input(screen.getByLabelText('Nombre del curso'), { target: { value: 'Álgebra' } });
    fillWeeklySchedule();
    fireEvent.click(screen.getByRole('button', { name: 'Agregar curso' }));

    await waitFor(() => {
      expect(createCourse).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Álgebra', academic_period_id: 'p1' }),
      );
    });
    expect(createSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        course_id: 'c2',
        day_of_week: 1,
        start_time: '08:00',
        end_time: '10:00',
        recurrence: 'weekly',
      }),
    );
  });

  it('renderiza tarjetas de cursos del período activo', async () => {
    listCourses.mockResolvedValue({
      courses: [
        {
          id: 'c1',
          name: 'Cálculo I',
          academic_period_id: 'p1',
          subject_id: null,
          professor_id: 'pr1',
          modality: 'in_person',
          color: '#4f46e5',
          professor: { id: 'pr1', name: 'Carlos Rodríguez', email: null },
        },
      ],
    });
    renderWithProviders(<CoursesPage />);
    expect(await screen.findByRole('heading', { name: 'Cálculo I' })).toBeInTheDocument();
    expect(screen.getByText('Carlos Rodríguez')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Entrar al curso' })).toHaveAttribute('href', '/courses/c1');
    expect(screen.getByRole('button', { name: 'Agregar curso' })).toBeInTheDocument();
  });
});
