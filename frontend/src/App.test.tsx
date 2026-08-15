import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

describe('Home', () => {
  it('muestra el saludo, el menú de inicio y las secciones de aprendizaje', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <App />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByText(/Buenos días|Buenas tardes|Buenas noches/)).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Menú de inicio' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Mis cursos/ })).toHaveAttribute('href', '/courses');
    expect(screen.getByRole('link', { name: /Práctica/ })).toHaveAttribute('href', '/practice');
    expect(screen.getByRole('link', { name: /Tutor IA/ })).toHaveAttribute('href', '/tutor');
    expect(screen.getByText('Hoy')).toBeInTheDocument();
    expect(screen.getByText('Te recomendamos estudiar')).toBeInTheDocument();
    expect(screen.getByText('Continúa estudiando')).toBeInTheDocument();
    expect(screen.queryByText('Campus y Teams')).not.toBeInTheDocument();
  });
});
