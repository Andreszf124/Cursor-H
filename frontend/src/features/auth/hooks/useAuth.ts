import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../stores/authStore';
import { authService } from '../services/authService';
import type { AuthResponse } from '../types';

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const session = useAuthStore((state) => state.session);
  const setAuth = useAuthStore((state) => state.setAuth);
  const clear = useAuthStore((state) => state.clear);
  const queryClient = useQueryClient();

  const applySession = (data: AuthResponse): void => {
    if (data.session) {
      setAuth(data.user, data.session);
    }
  };

  const login = useMutation({
    mutationFn: authService.login,
    onSuccess: applySession,
  });

  const register = useMutation({
    mutationFn: authService.register,
    onSuccess: applySession,
  });

  const logout = useMutation({
    mutationFn: authService.logout,
    onSettled: () => {
      // Pase lo que pase server-side, la sesión local se descarta (RF-003)
      clear();
      queryClient.clear();
    },
  });

  return {
    user,
    isAuthenticated: session !== null,
    login,
    register,
    logout,
  };
}
