import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { TutorPage } from './TutorPage';

const mocks = vi.hoisted(() => ({
  listConversations: vi.fn(),
  listMessages: vi.fn(),
  chat: vi.fn(),
  listCourses: vi.fn(),
}));

vi.mock('../services/tutorService', () => ({
  tutorService: {
    listConversations: mocks.listConversations,
    listMessages: mocks.listMessages,
    chat: mocks.chat,
  },
}));

vi.mock('../../courses/services/coursesService', () => ({
  coursesService: { listCourses: mocks.listCourses },
}));

function renderTutor(path = '/tutor') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/tutor" element={<TutorPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TutorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listConversations.mockResolvedValue({ conversations: [] });
    mocks.listMessages.mockResolvedValue({ messages: [] });
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
  });

  it('permite preguntar sin crear una conversación vacía y respeta el curso de la URL', async () => {
    mocks.chat.mockResolvedValue({
      conversation_id: 'conv-1',
      used_materials: false,
      sources: [],
      message: {
        id: 'm2',
        role: 'assistant',
        content: 'No tengo material tuyo indexado para responder con evidencia de clase.',
        sources: [],
      },
    });
    mocks.listMessages.mockResolvedValue({
      messages: [
        { id: 'm1', role: 'user', content: '¿Qué es la regla de la cadena?' },
        {
          id: 'm2',
          role: 'assistant',
          content: 'No tengo material tuyo indexado para responder con evidencia de clase.',
          sources: [],
        },
      ],
    });

    renderTutor('/tutor?course=c1');
    expect(await screen.findByRole('heading', { name: 'Tutor IA' })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Cálculo I' })).toBeInTheDocument();
    expect(screen.getByLabelText('Curso')).toHaveValue('c1');
    expect(screen.getByRole('radio', { name: 'Explicar' })).toBeChecked();

    fireEvent.click(screen.getByRole('radio', { name: 'Ejemplos' }));
    fireEvent.change(screen.getByLabelText('Tu duda'), {
      target: { value: '¿Qué es la regla de la cadena?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await waitFor(() => {
      expect(mocks.chat).toHaveBeenCalledWith({
        conversation_id: undefined,
        message: '¿Qué es la regla de la cadena?',
        mode: 'example',
        course_id: 'c1',
      });
    });
    expect(await screen.findByText(/No tengo material tuyo indexado/)).toBeInTheDocument();
    expect(screen.getByText('Esta respuesta no usó tus materiales.')).toBeInTheDocument();
  });

  it('muestra las fuentes cuando el tutor usó apuntes', async () => {
    mocks.listConversations.mockResolvedValue({
      conversations: [{ id: 'conv-1', title: 'Regla de la cadena', course_id: 'c1' }],
    });
    mocks.listMessages.mockResolvedValue({
      messages: [
        { id: 'm1', role: 'user', content: 'Explícame la regla de la cadena' },
        {
          id: 'm2',
          role: 'assistant',
          content: 'Según tus apuntes: la derivada de una composición es el producto de derivadas.',
          sources: [{ chunk_id: 'ch1', material_id: 'mat1', title: 'Apuntes clase 5', similarity: 0.9 }],
        },
      ],
    });

    renderTutor('/tutor?course=c1');
    fireEvent.click(await screen.findByRole('button', { name: 'Regla de la cadena' }));
    expect(await screen.findByText(/Según tus apuntes/)).toBeInTheDocument();
    expect(screen.getByText('Fuentes: Apuntes clase 5')).toBeInTheDocument();
    expect(screen.queryByText('Esta respuesta no usó tus materiales.')).not.toBeInTheDocument();
  });

  it('rellena la duda al elegir una sugerencia', async () => {
    renderTutor();
    fireEvent.click(await screen.findByRole('button', { name: /analogía cotidiana/ }));
    expect(screen.getByLabelText('Tu duda')).toHaveValue('Explícalo con una analogía cotidiana');
    expect(screen.getByRole('radio', { name: 'Analogía' })).toBeChecked();
  });
});
