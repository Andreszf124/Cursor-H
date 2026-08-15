import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/utils';
import { ProgressPage } from './ProgressPage';

vi.mock('../services/progressService', () => ({
  progressService: {
    overview: vi.fn(),
    byConcept: vi.fn(),
  },
}));

vi.mock('../../learning/services/learningService', () => ({
  knowledgeService: { prioritizedGaps: vi.fn() },
}));

import { knowledgeService } from '../../learning/services/learningService';
import { progressService } from '../services/progressService';

describe('ProgressPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(knowledgeService.prioritizedGaps).mockResolvedValue({ gaps: [] });
  });

  it('no muestra JSON y explica cuando no hay dominio', async () => {
    vi.mocked(progressService.overview).mockResolvedValue({
      courses: 0,
      materials: 0,
      checkins_completed: 0,
      practices_completed: 0,
      active_gaps: 0,
      concepts_tracked: 0,
      average_mastery: 0,
    });
    vi.mocked(progressService.byConcept).mockResolvedValue({ concepts: [] });
    renderWithProviders(<ProgressPage />);
    expect(await screen.findByRole('heading', { name: 'Progreso' })).toBeInTheDocument();
    expect(screen.getByText(/Aún no hay suficiente evidencia/)).toBeInTheDocument();
    expect(screen.queryByText(/average_mastery/)).not.toBeInTheDocument();
  });

  it('muestra barras de dominio cuando hay evidencia', async () => {
    vi.mocked(progressService.overview).mockResolvedValue({
      courses: 1,
      materials: 0,
      checkins_completed: 2,
      practices_completed: 1,
      active_gaps: 1,
      concepts_tracked: 1,
      average_mastery: 72,
    });
    vi.mocked(progressService.byConcept).mockResolvedValue({
      concepts: [{ concept_id: 'x', name: 'Integral definida', mastery_percentage: 72, course_id: 'c1' }],
    });
    renderWithProviders(<ProgressPage />);
    expect(await screen.findByText('Integral definida')).toBeInTheDocument();
    expect(screen.getByText('72%')).toBeInTheDocument();
  });
});
