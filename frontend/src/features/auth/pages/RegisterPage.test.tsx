import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../test/utils';
import { useAuthStore } from '../../../stores/authStore';
import { RegisterPage } from './RegisterPage';

const mocks = vi.hoisted(() => ({
  register: vi.fn(),
}));

vi.mock('../services/authService', () => ({
  authService: { register: mocks.register },
}));

const USER = { id: 'user-1', email: 'ana@universidad.edu' };

async function fillWizard(): Promise<void> {
  fireEvent.input(screen.getByLabelText('Nombre completo'), {
    target: { value: 'Ana Mora' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
  fireEvent.input(await screen.findByLabelText('Correo electrónico'), {
    target: { value: 'ana@universidad.edu' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
  fireEvent.input(await screen.findByLabelText('Contraseña'), {
    target: { value: 'Password123' },
  });
  fireEvent.input(screen.getByLabelText('Confirmar contraseña'), {
    target: { value: 'Password123' },
  });
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clear();
  });

  it('empieza con la pregunta del nombre', () => {
    renderWithProviders(<RegisterPage />);
    expect(screen.getByRole('heading', { name: /¿Cómo te llamas/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre completo')).toBeInTheDocument();
    expect(screen.queryByLabelText('Correo electrónico')).not.toBeInTheDocument();
  });

  it('avanza con Enter desde el nombre', async () => {
    renderWithProviders(<RegisterPage />);
    fireEvent.input(screen.getByLabelText('Nombre completo'), {
      target: { value: 'Ana Mora' },
    });
    fireEvent.submit(screen.getByLabelText('Nombre completo').closest('form')!);
    expect(await screen.findByLabelText('Correo electrónico')).toBeInTheDocument();
  });

  it('valida que las contraseñas coincidan sin llamar al servicio', async () => {
    renderWithProviders(<RegisterPage />);
    await fillWizard();
    fireEvent.input(screen.getByLabelText('Confirmar contraseña'), {
      target: { value: 'Distinta123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText('Las contraseñas no coinciden')).toBeInTheDocument();
    expect(mocks.register).not.toHaveBeenCalled();
  });

  it('registra sin enviar confirmPassword al servicio y guarda la sesión', async () => {
    const session = { access_token: 'access-1', refresh_token: 'refresh-1' };
    mocks.register.mockResolvedValue({ user: USER, session });
    renderWithProviders(<RegisterPage />);
    await fillWizard();
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => {
      expect(mocks.register.mock.calls[0]?.[0]).toEqual({
        full_name: 'Ana Mora',
        email: 'ana@universidad.edu',
        password: 'Password123',
      });
    });
    await waitFor(() => {
      expect(useAuthStore.getState().session).toEqual(session);
    });
  });

  it('muestra aviso de confirmación de email cuando no hay sesión', async () => {
    mocks.register.mockResolvedValue({ user: USER, session: null });
    renderWithProviders(<RegisterPage />);
    await fillWizard();
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByRole('heading', { name: 'Revisa tu correo' })).toBeInTheDocument();
    expect(useAuthStore.getState().session).toBeNull();
  });
});
