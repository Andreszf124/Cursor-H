import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Alert } from '../../../components/feedback/Alert';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { profileService } from '../services/profileService';
import { preferencesSchema, type PreferencesFormInput } from '../schemas/profileSchema';
import type { LearningPreferences } from '../types';

const LEARNING_STYLES = [
  { value: 'visual', label: 'Visual' },
  { value: 'auditory', label: 'Auditivo' },
  { value: 'kinesthetic', label: 'Kinestésico' },
  { value: 'mixed', label: 'Mixto' },
] as const;

const DIFFICULTIES = [
  { value: 'adaptive', label: 'Adaptativa' },
  { value: 'easy', label: 'Fácil' },
  { value: 'challenging', label: 'Desafiante' },
] as const;

const TECHNIQUES = [
  { value: 'pomodoro', label: 'Pomodoro' },
  { value: 'active_recall', label: 'Recuerdo activo' },
  { value: 'spaced_repetition', label: 'Repetición espaciada' },
  { value: 'feynman', label: 'Técnica Feynman' },
  { value: 'mind_mapping', label: 'Mapas mentales' },
] as const;

interface PreferencesFormProps {
  preferences: LearningPreferences | null;
}

export function PreferencesForm({ preferences }: PreferencesFormProps) {
  const queryClient = useQueryClient();
  const update = useMutation({
    mutationFn: profileService.updatePreferences,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['profile'] }),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PreferencesFormInput>({
    resolver: zodResolver(preferencesSchema),
    values: {
      learning_style: preferences?.learning_style ?? 'mixed',
      session_duration_minutes: preferences?.session_duration_minutes ?? 45,
      difficulty_preference: preferences?.difficulty_preference ?? 'adaptive',
      techniques: preferences?.techniques ?? [],
    },
  });

  const onSubmit = handleSubmit((values) => {
    update.mutate(values);
  });

  const selectClasses =
    'mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200';

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Preferencias de aprendizaje</h2>
      <p className="mt-1 text-sm text-slate-600">
        El copiloto adapta las sesiones de estudio a estas preferencias.
      </p>

      <form onSubmit={(event) => void onSubmit(event)} noValidate className="mt-4 space-y-4">
        {update.error && <Alert variant="error">{update.error.message}</Alert>}
        {update.isSuccess && <Alert variant="success">Preferencias guardadas.</Alert>}

        <div>
          <label htmlFor="learning_style" className="block text-sm font-medium text-slate-700">
            Estilo de aprendizaje
          </label>
          <select id="learning_style" className={selectClasses} {...register('learning_style')}>
            {LEARNING_STYLES.map((style) => (
              <option key={style.value} value={style.value}>
                {style.label}
              </option>
            ))}
          </select>
        </div>

        <Input
          id="session_duration_minutes"
          type="number"
          label="Duración de sesión (minutos)"
          min={10}
          max={240}
          error={errors.session_duration_minutes?.message}
          {...register('session_duration_minutes')}
        />

        <div>
          <label
            htmlFor="difficulty_preference"
            className="block text-sm font-medium text-slate-700"
          >
            Dificultad preferida
          </label>
          <select
            id="difficulty_preference"
            className={selectClasses}
            {...register('difficulty_preference')}
          >
            {DIFFICULTIES.map((difficulty) => (
              <option key={difficulty.value} value={difficulty.value}>
                {difficulty.label}
              </option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-slate-700">Técnicas de estudio</legend>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {TECHNIQUES.map((technique) => (
              <label
                key={technique.value}
                className="flex items-center gap-2 text-sm text-slate-700"
              >
                <input
                  type="checkbox"
                  value={technique.value}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-300"
                  {...register('techniques')}
                />
                {technique.label}
              </label>
            ))}
          </div>
        </fieldset>

        <Button type="submit" loading={update.isPending}>
          Guardar preferencias
        </Button>
      </form>
    </section>
  );
}
