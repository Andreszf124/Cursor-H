import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

describe('Home', () => {
  it('muestra el saludo y las secciones de aprendizaje, no un menú de atajos', () => {
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
    expect(screen.getByText('Hoy')).toBeInTheDocument();
    expect(screen.getByText('Te recomendamos estudiar')).toBeInTheDocument();
    expect(screen.getByText('Continúa estudiando')).toBeInTheDocument();
    expect(screen.queryByText('Campus y Teams')).not.toBeInTheDocument();
  });
});
