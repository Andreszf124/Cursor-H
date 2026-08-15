import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { SidebarPomodoro } from './SidebarPomodoro';

const mocks = vi.hoisted(() => ({
  listCourses: vi.fn(),
  generate: vi.fn(),
}));

vi.mock('../../courses/services/coursesService', () => ({
  coursesService: { listCourses: mocks.listCourses },
}));

vi.mock('../../learning/services/learningService', () => ({
  practiceService: { generate: mocks.generate },
}));

function renderPomodoro() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<SidebarPomodoro durationSeconds={1} />} />
          <Route path="/practice/:id" element={<p>Preguntas del curso</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SidebarPomodoro', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listCourses.mockResolvedValue({
      courses: [
        {
          id: 'c1',
          name: 'Cálculo I',
          academic_period_id: 'p1',
          subject_id: null,
          professor_id: null,
          modality: 'in_person',
          color: null,
          professor: null,
        },
      ],
    });
    mocks.generate.mockResolvedValue({
      practice: { id: 'pr1', title: 'Práctica: Cálculo I', status: 'pending' },
      exercises: [],
    });
  });

  it('al terminar el pomodoro genera preguntas del curso elegido', async () => {
    renderPomodoro();
    expect(await screen.findByRole('option', { name: 'Cálculo I' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Curso'), { target: { value: 'c1' } });
    expect(screen.getByLabelText('Curso')).toHaveValue('c1');
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar' }));

    expect(await screen.findByText('Preguntas del curso', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(mocks.generate).toHaveBeenCalledWith({
      course_id: 'c1',
      exercise_count: 5,
    });
  });
});
