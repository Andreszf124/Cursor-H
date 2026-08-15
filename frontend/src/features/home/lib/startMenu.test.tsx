import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/utils';
import { StartMenu } from '../components/StartMenu';
import { practiceHref } from './startMenu';

describe('practiceHref', () => {
  it('arma la URL de práctica con curso y concepto', () => {
    expect(practiceHref()).toBe('/practice');
    expect(practiceHref('c1')).toBe('/practice?course=c1');
    expect(practiceHref('c1', 'n1')).toBe('/practice?course=c1&concept=n1');
  });
});

describe('StartMenu', () => {
  it('lleva a las pantallas que sí funcionan, no a atajos rotos', () => {
    renderWithProviders(<StartMenu />);
    expect(screen.getByRole('navigation', { name: 'Menú de inicio' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Mis cursos/ })).toHaveAttribute('href', '/courses');
    expect(screen.getByRole('link', { name: /Práctica/ })).toHaveAttribute('href', '/practice');
    expect(screen.getByRole('link', { name: /Tutor IA/ })).toHaveAttribute('href', '/tutor');
    expect(screen.getByRole('link', { name: /Calendario/ })).toHaveAttribute('href', '/schedule');
    expect(screen.getByRole('link', { name: /Progreso/ })).toHaveAttribute('href', '/progress');
    expect(screen.queryByText('Campus y Teams')).not.toBeInTheDocument();
  });
});
