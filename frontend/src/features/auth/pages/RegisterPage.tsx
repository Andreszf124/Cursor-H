import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert } from '../../../components/feedback/Alert';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { AuthCard } from '../components/AuthCard';
import { WizardLayout } from '../../onboarding/components/WizardLayout';
import { useAuth } from '../hooks/useAuth';
import { registerSchema } from '../schemas';

const STEPS = [
  { id: 'name', label: 'Tu nombre' },
  { id: 'email', label: 'Correo' },
  { id: 'password', label: 'Contraseña' },
];

const TIPS = [
  'Así te llamaremos en tu experiencia personalizada.',
  'Usa el correo con el que estudias. Ejemplo: @estudiantes.ucr.ac.cr',
  'Mínimo 8 caracteres. No la compartimos ni la guardamos en texto plano.',
];

export function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerMutation } = useAuth();
  const [step, setStep] = useState(0);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && step > 0) {
        event.preventDefault();
        setFieldError(null);
        setStep((current) => current - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step]);

  const advanceFromName = (): void => {
    if (!fullName.trim()) {
      setFieldError('El nombre es requerido');
      return;
    }
    setFieldError(null);
    setStep(1);
  };

  const advanceFromEmail = (): void => {
    const parsed = registerSchema.safeParse({
      full_name: fullName,
      email,
      password: 'Password123',
      confirmPassword: 'Password123',
    });
    if (!parsed.success) {
      const emailIssue = parsed.error.issues.find((issue) => issue.path[0] === 'email');
      setFieldError(emailIssue?.message ?? 'Correo electrónico inválido');
      return;
    }
    setFieldError(null);
    setStep(2);
  };

  const submitAccount = async (): Promise<void> => {
    const parsed = registerSchema.safeParse({
      full_name: fullName,
      email,
      password,
      confirmPassword,
    });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? 'Revisa los datos');
      return;
    }
    setFieldError(null);
    try {
      const result = await registerMutation.mutateAsync({
        full_name: parsed.data.full_name,
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (result.session) {
        navigate('/onboarding', { replace: true });
      } else {
        setNeedsEmailConfirmation(true);
      }
    } catch {
      // registerMutation.error
    }
  };

  if (needsEmailConfirmation) {
    return (
      <AuthCard title="Revisa tu correo">
        <Alert variant="success">
          Tu cuenta fue creada. Revisa tu correo y confirma tu dirección para poder iniciar sesión.
        </Alert>
        <p className="mt-4 text-sm text-slate-600">
          <Link to="/login" className="text-indigo-600 hover:underline">
            Ir a iniciar sesión
          </Link>
        </p>
      </AuthCard>
    );
  }

  const passwordLongEnough = password.length >= 8;
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  return (
    <WizardLayout title="Crear cuenta" steps={STEPS} current={step} tip={TIPS[step] ?? ''}>
      {registerMutation.error && (
        <div className="mb-4">
          <Alert variant="error">{registerMutation.error.message}</Alert>
        </div>
      )}
      {fieldError && (
        <div className="mb-4">
          <Alert variant="error">{fieldError}</Alert>
        </div>
      )}

      {step === 0 && (
        <form
          className="space-y-6 text-center"
          onSubmit={(event) => {
            event.preventDefault();
            advanceFromName();
          }}
        >
          <div>
            <h2 className="text-3xl font-bold text-slate-900">¡Bienvenido! ¿Cómo te llamas?</h2>
            <p className="mt-2 text-slate-500">Así te llamaremos en tu experiencia personalizada</p>
          </div>
          <Input
            id="full_name"
            label="Nombre completo"
            placeholder="Ej: María González"
            autoComplete="name"
            inputSize="lg"
            autoFocus
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
          <Button type="submit" className="w-full">
            Continuar
          </Button>
          <p className="text-sm text-slate-400">Presiona Enter para continuar</p>
        </form>
      )}

      {step === 1 && (
        <form
          className="space-y-6 text-center"
          onSubmit={(event) => {
            event.preventDefault();
            advanceFromEmail();
          }}
        >
          <div>
            <h2 className="text-3xl font-bold text-slate-900">¿Cuál es tu correo?</h2>
            <p className="mt-2 text-slate-500">Si puedes, usa tu correo institucional</p>
          </div>
          <Input
            id="email"
            type="email"
            label="Correo electrónico"
            placeholder="nombre@estudiantes.ucr.ac.cr"
            hint="Sugerencia: @estudiantes.ucr.ac.cr u otro dominio universitario"
            autoComplete="email"
            inputSize="lg"
            autoFocus
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStep(0)}>
              Atrás
            </Button>
            <Button type="submit" className="flex-1">
              Continuar
            </Button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            void submitAccount();
          }}
        >
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-900">Crea una contraseña segura</h2>
            <p className="mt-2 text-slate-500">Mínimo 8 caracteres. Tú controlas el acceso.</p>
          </div>
          <Input
            id="password"
            type="password"
            label="Contraseña"
            autoComplete="new-password"
            inputSize="lg"
            autoFocus
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Input
            id="confirmPassword"
            type="password"
            label="Confirmar contraseña"
            autoComplete="new-password"
            inputSize="lg"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          <ul className="space-y-1 text-sm">
            <li className={passwordLongEnough ? 'text-emerald-700' : 'text-slate-500'}>
              {passwordLongEnough ? '✓' : '○'} Al menos 8 caracteres
            </li>
            <li className={passwordsMatch ? 'text-emerald-700' : 'text-slate-500'}>
              {passwordsMatch ? '✓' : '○'} Las contraseñas coinciden
            </li>
          </ul>
          <Button type="submit" loading={registerMutation.isPending} className="w-full">
            Crear cuenta
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-slate-600">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="text-indigo-600 hover:underline">
          Inicia sesión
        </Link>
      </p>
    </WizardLayout>
  );
}
