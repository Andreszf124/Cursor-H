import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Alert } from '../../../components/feedback/Alert';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { AuthCard } from '../components/AuthCard';
import { authService } from '../services/authService';
import { resetPasswordSchema, type ResetPasswordInput } from '../schemas';

/** Lee el recovery token del hash de la URL del enlace de Supabase (#access_token=...&type=recovery) */
function readRecoveryToken(): string | null {
  const params = new URLSearchParams(window.location.hash.slice(1));
  return params.get('access_token');
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [recoveryToken] = useState<string | null>(readRecoveryToken);
  const reset = useMutation({
    mutationFn: (input: { password: string; token: string }) =>
      authService.resetPassword(input.password, input.token),
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  if (!recoveryToken) {
    return (
      <AuthCard title="Enlace inválido">
        <Alert variant="error">
          El enlace de recuperación es inválido o está incompleto. Solicita uno nuevo.
        </Alert>
        <p className="mt-4 text-sm text-slate-600">
          <Link to="/forgot-password" className="text-indigo-600 hover:underline">
            Solicitar nuevo enlace
          </Link>
        </p>
      </AuthCard>
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      await reset.mutateAsync({ password: values.password, token: recoveryToken });
      navigate('/login', { replace: true });
    } catch {
      // El error se muestra desde reset.error
    }
  });

  return (
    <AuthCard title="Nueva contraseña" subtitle="Elige una contraseña segura de al menos 8 caracteres">
      <form onSubmit={(event) => void onSubmit(event)} noValidate className="space-y-4">
        {reset.error && <Alert variant="error">{reset.error.message}</Alert>}

        <Input
          id="password"
          type="password"
          label="Nueva contraseña"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          id="confirmPassword"
          type="password"
          label="Confirmar contraseña"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button type="submit" loading={reset.isPending} className="w-full">
          Guardar contraseña
        </Button>
      </form>
    </AuthCard>
  );
}
