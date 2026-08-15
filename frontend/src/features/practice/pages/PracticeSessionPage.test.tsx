import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { PracticeSessionPage } from './PracticeSessionPage';

vi.mock('../../learning/services/learningService', () => ({
  practiceService: {
    get: vi.fn(),
    submit: vi.fn(),
    complete: vi.fn(),
  },
}));

import { practiceService } from '../../learning/services/learningService';

function renderSession() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/practice/p1']}>
        <Routes>
          <Route path="/practice/:practiceId" element={<PracticeSessionPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PracticeSessionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(practiceService.get).mockResolvedValue({
      id: 'p1',
      course_id: 'c1',
      title: 'Práctica: Integral definida',
      status: 'pending',
      score: null,
      exercises: [
        {
          id: 'e1',
          position: 0,
          statement: 'Calcula la integral definida',
          options: null,
          difficulty: 'medium',
          last_attempt: null,
        },
      ],
    });
  });

  it('no muestra la solución antes de comprobar', async () => {
    renderSession();
    expect(await screen.findByText('Calcula la integral definida')).toBeInTheDocument();
    expect(screen.getByText(/creada a partir de lo visto en tu clase/)).toBeInTheDocument();
    expect(screen.queryByText(/Respuesta esperada/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Comprobar' })).toBeDisabled();
  });

  it('muestra feedback solo después de enviar la respuesta', async () => {
    vi.mocked(practiceService.submit).mockResolvedValue({
      id: 'a1',
      is_correct: false,
      score: 0,
      feedback: 'Revisa los límites de integración.',
      solution: 'Respuesta esperada: 14/3',
    });
    renderSession();
    fireEvent.change(await screen.findByLabelText('Tu respuesta'), {
      target: { value: '7' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }));
    expect(await screen.findByText('Incorrecto')).toBeInTheDocument();
    expect(screen.getByText('Revisa los límites de integración.')).toBeInTheDocument();
    expect(screen.getByText('Respuesta esperada: 14/3')).toBeInTheDocument();
  });
});
