import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Alert } from '../../../components/feedback/Alert';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { AvatarUpload } from '../components/AvatarUpload';
import { DeleteAccountSection } from '../components/DeleteAccountSection';
import { PreferencesForm } from '../components/PreferencesForm';
import { profileService } from '../services/profileService';
import { profileSchema, type ProfileFormInput } from '../schemas/profileSchema';

export function ProfilePage() {
  const queryClient = useQueryClient();
  const {
    data: profile,
    isLoading,
    error,
  } = useQuery({ queryKey: ['profile'], queryFn: profileService.getProfile });

  const update = useMutation({
    mutationFn: profileService.updateProfile,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['profile'] }),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormInput>({
    resolver: zodResolver(profileSchema),
    values: {
      full_name: profile?.full_name ?? '',
      language: profile?.language ?? 'es',
      timezone: profile?.timezone ?? 'America/Costa_Rica',
    },
  });

  const onSubmit = handleSubmit((values) => {
    update.mutate(values);
  });

  if (isLoading) {
    return <p className="text-sm text-slate-600">Cargando perfil…</p>;
  }

  if (error || !profile) {
    return <Alert variant="error">No se pudo cargar el perfil. Intenta de nuevo.</Alert>;
  }

  const selectClasses =
    'mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Mi perfil</h1>

      <AvatarUpload avatarUrl={profile.avatar_url} fullName={profile.full_name} />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Datos personales</h2>

        <form onSubmit={(event) => void onSubmit(event)} noValidate className="mt-4 space-y-4">
          {update.error && <Alert variant="error">{update.error.message}</Alert>}
          {update.isSuccess && <Alert variant="success">Perfil actualizado.</Alert>}

          <Input
            id="full_name"
            type="text"
            label="Nombre completo"
            autoComplete="name"
            error={errors.full_name?.message}
            {...register('full_name')}
          />

          <div>
            <label htmlFor="language" className="block text-sm font-medium text-slate-700">
              Idioma de la interfaz
            </label>
            <select id="language" className={selectClasses} {...register('language')}>
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>

          <Input
            id="timezone"
            type="text"
            label="Zona horaria"
            placeholder="America/Costa_Rica"
            error={errors.timezone?.message}
            {...register('timezone')}
          />

          <Button type="submit" loading={update.isPending}>
            Guardar cambios
          </Button>
        </form>
      </section>

      <PreferencesForm preferences={profile.learning_preferences} />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Cuenta y estudios</h2>
        <p className="mt-1 text-sm text-slate-500">Ajustes que no necesitas en el día a día.</p>
        <ul className="mt-4 divide-y divide-slate-100">
          <li>
            <Link to="/career/setup" className="block py-3 text-sm font-medium text-indigo-700 hover:underline">
              Carrera y período académico
            </Link>
          </li>
          <li>
            <Link to="/integrations" className="block py-3 text-sm font-medium text-indigo-700 hover:underline">
              Campus y Teams
            </Link>
          </li>
          <li>
            <Link to="/curriculum/import" className="block py-3 text-sm font-medium text-indigo-700 hover:underline">
              Importar plan de estudios
            </Link>
          </li>
        </ul>
      </section>

      <DeleteAccountSection />
    </div>
  );
}
