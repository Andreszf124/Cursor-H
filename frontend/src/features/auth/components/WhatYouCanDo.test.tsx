import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/utils';
import { WhatYouCanDo } from './WhatYouCanDo';

describe('WhatYouCanDo', () => {
  it('lista las capacidades reales del copiloto', () => {
    renderWithProviders(<WhatYouCanDo />);
    expect(screen.getByRole('heading', { name: 'Qué puedes hacer' })).toBeInTheDocument();
    expect(
      screen.getByText(/Parte de tus clases reales: no pide la clave del campus/),
    ).toBeInTheDocument();
    expect(screen.getByText('Registrar cursos y horario')).toBeInTheDocument();
    expect(screen.getByText('Check-in después de clase')).toBeInTheDocument();
    expect(screen.getByText('Practicar lo que se te traba')).toBeInTheDocument();
    expect(screen.getByText('Preguntar al tutor')).toBeInTheDocument();
    expect(screen.getByText('Ver tu dominio')).toBeInTheDocument();
  });
});
