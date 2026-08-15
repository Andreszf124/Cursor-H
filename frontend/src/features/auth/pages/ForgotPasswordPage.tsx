import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Alert } from '../../../components/feedback/Alert';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { AuthCard } from '../components/AuthCard';
import { authService } from '../services/authService';
import { forgotPasswordSchema, type ForgotPasswordInput } from '../schemas';

export function ForgotPasswordPage() {
  const forgot = useMutation({
    mutationFn: (input: ForgotPasswordInput) => authService.forgotPassword(input.email),
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = handleSubmit((values) => {
    forgot.mutate(values);
  });

  return (
    <AuthCard
      title="Recuperar contraseña"
      subtitle="Te enviaremos un enlace para restablecer tu contraseña"
    >
      {forgot.isSuccess ? (
        <Alert variant="success">
          Si el correo existe, recibirás un enlace de recuperación en unos minutos.
        </Alert>
      ) : (
        <form onSubmit={(event) => void onSubmit(event)} noValidate className="space-y-4">
          {forgot.error && <Alert variant="error">{forgot.error.message}</Alert>}

          <Input
            id="email"
            type="email"
            label="Correo electrónico"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />

          <Button type="submit" loading={forgot.isPending} className="w-full">
            Enviar enlace
          </Button>
        </form>
      )}

      <p className="mt-4 text-sm text-slate-600">
        <Link to="/login" className="text-indigo-600 hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </AuthCard>
  );
}
