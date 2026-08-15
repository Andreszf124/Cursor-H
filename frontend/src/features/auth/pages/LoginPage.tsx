import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Alert } from '../../../components/feedback/Alert';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { AuthCard } from '../components/AuthCard';
import { useAuth } from '../hooks/useAuth';
import { loginSchema, type LoginInput } from '../schemas';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login.mutateAsync(values);
      navigate('/', { replace: true });
    } catch {
      // El error se muestra desde login.error
    }
  });

  return (
    <AuthCard title="Iniciar sesión" subtitle="Bienvenido de nuevo a Academic Copilot">
      <form onSubmit={(event) => void onSubmit(event)} noValidate className="space-y-4">
        {login.error && <Alert variant="error">{login.error.message}</Alert>}

        <Input
          id="email"
          type="email"
          label="Correo electrónico"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          id="password"
          type="password"
          label="Contraseña"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <Button type="submit" loading={login.isPending} className="w-full">
          Iniciar sesión
        </Button>
      </form>

      <div className="mt-4 flex flex-col gap-1 text-sm text-slate-600">
        <Link to="/forgot-password" className="text-indigo-600 hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>
        <p>
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-indigo-600 hover:underline">
            Regístrate
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
