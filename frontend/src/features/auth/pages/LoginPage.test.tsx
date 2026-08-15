import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../test/utils';
import { useAuthStore } from '../../../stores/authStore';
import { LoginPage } from './LoginPage';

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
}));

vi.mock('../services/authService', () => ({
  authService: { login: mocks.login },
}));

const USER = { id: 'user-1', email: 'ana@universidad.edu' };
const SESSION = { access_token: 'access-1', refresh_token: 'refresh-1' };

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clear();
  });

  it('renderiza el formulario de inicio de sesión', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });

  it('muestra errores de validación sin llamar al servicio', async () => {
    renderWithProviders(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByText('Correo electrónico inválido')).toBeInTheDocument();
    expect(screen.getByText('La contraseña es requerida')).toBeInTheDocument();
    expect(mocks.login).not.toHaveBeenCalled();
  });

  it('con datos válidos llama al servicio y guarda la sesión en el store', async () => {
    mocks.login.mockResolvedValue({ user: USER, session: SESSION });
    renderWithProviders(<LoginPage />);

    fireEvent.input(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'ana@universidad.edu' },
    });
    fireEvent.input(screen.getByLabelText('Contraseña'), {
      target: { value: 'Password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => {
      expect(mocks.login.mock.calls[0]?.[0]).toEqual({
        email: 'ana@universidad.edu',
        password: 'Password123',
      });
    });
    await waitFor(() => {
      expect(useAuthStore.getState().session).toEqual(SESSION);
    });
  });

  it('muestra el mensaje de error cuando las credenciales son inválidas', async () => {
    mocks.login.mockRejectedValue(new Error('Credenciales inválidas'));
    renderWithProviders(<LoginPage />);

    fireEvent.input(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'ana@universidad.edu' },
    });
    fireEvent.input(screen.getByLabelText('Contraseña'), {
      target: { value: 'incorrecta1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByText('Credenciales inválidas')).toBeInTheDocument();
    expect(useAuthStore.getState().session).toBeNull();
  });
});
