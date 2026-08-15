import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert } from '../../../components/feedback/Alert';
import { Button } from '../../../components/ui/Button';
import { careerService } from '../../career/services/careerService';
import { coursesService } from '../../courses/services/coursesService';
import { materialsService } from '../../learning/services/learningService';
import { scheduleService } from '../../schedule/services/scheduleService';
import { CourseDraftList, type CourseDraft } from '../components/CourseDraftList';
import { OnboardingShell } from '../components/OnboardingShell';
import { PreferenceCards } from '../components/PreferenceCards';
import { useOnboarding } from '../hooks/useOnboarding';

const STEPS = [
  { id: 'courses', label: 'Cursos' },
  { id: 'prefs', label: 'Estudio' },
];

const COURSE_COLORS = ['#0F766E', '#1D4ED8', '#B45309', '#9F1239', '#6D28D9', '#334155'];

function toDrafts(courses: Array<{ name: string }>): CourseDraft[] {
  return courses.map((course, index) => ({
    localId: `imported-${index}-${course.name}`,
    name: course.name,
    files: [],
    days: [],
    startTime: '',
    endTime: '',
  }));
}

function fileTitle(file: File): string {
  return file.name.replace(/\.[^.]+$/, '').slice(0, 200);
}

export function OnboardingWizard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { complete, profileService, onboardingService } = useOnboarding();

  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState<CourseDraft[] | null>(null);
  const [learningStyle, setLearningStyle] = useState<
    'visual' | 'auditory' | 'kinesthetic' | 'mixed'
  >('mixed');
  const [minutes, setMinutes] = useState(60);

  const oauthCode = searchParams.get('code');
  const teamsQuery = useQuery({
    queryKey: ['onboarding-teams', oauthCode],
    enabled: Boolean(oauthCode),
    queryFn: async () => {
      await onboardingService.teamsCallback(oauthCode ?? '');
      const imported = await onboardingService.teamsCourses();
      setSearchParams({}, { replace: true });
      return imported;
    },
  });

  const importedDrafts = toDrafts(teamsQuery.data?.courses ?? []);
  const courseDrafts = drafts ?? importedDrafts;

  const persistCourses = async (): Promise<void> => {
    const period = await careerService.ensureActivePeriod();
    for (const [index, draft] of courseDrafts.entries()) {
      const course = await coursesService.createCourse({
        name: draft.name,
        academic_period_id: period.id,
        modality: 'in_person',
        color: COURSE_COLORS[index % COURSE_COLORS.length],
      });
      for (const day of draft.days) {
        await scheduleService.createSchedule({
          course_id: course.id,
          day_of_week: day,
          start_time: draft.startTime,
          end_time: draft.endTime,
          recurrence: 'weekly',
        });
      }
      for (const file of draft.files) {
        await materialsService.upload(file, { course_id: course.id, title: fileTitle(file) });
      }
    }
  };

  const saveCourses = async (skip: boolean): Promise<void> => {
    setError(null);
    setBusy(true);
    try {
      if (!skip && courseDrafts.length > 0) {
        await persistCourses();
      }
      setStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los cursos');
    } finally {
      setBusy(false);
    }
  };

  const finish = async (): Promise<void> => {
    setError(null);
    setBusy(true);
    try {
      await profileService.updatePreferences({
        learning_style: learningStyle,
        session_duration_minutes: minutes,
        difficulty_preference: 'adaptive',
      });
      await complete.mutateAsync();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo terminar la configuración');
    } finally {
      setBusy(false);
    }
  };

  return (
    <OnboardingShell steps={STEPS} current={step}>
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
        {error ? (
          <div className="mb-4">
            <Alert variant="error">{error}</Alert>
          </div>
        ) : null}
        {teamsQuery.error ? (
          <div className="mb-4">
            <Alert variant="error">No se pudieron traer cursos de Teams. Agrégalos a mano.</Alert>
          </div>
        ) : null}

        {step === 0 ? (
          <CourseDraftList
            drafts={courseDrafts}
            onAdd={(draft) => setDrafts([...courseDrafts, draft])}
            onRemove={(localId) =>
              setDrafts(courseDrafts.filter((item) => item.localId !== localId))
            }
            busy={busy}
            onSkip={() => void saveCourses(true)}
            onContinue={() => void saveCourses(false)}
          />
        ) : null}

        {step === 1 ? (
          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              void finish();
            }}
          >
            <header>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                Cómo prefieres estudiar
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Esto ajusta la duración de las sesiones. Puedes cambiarlo después en Perfil.
              </p>
            </header>
            <PreferenceCards value={learningStyle} onChange={setLearningStyle} />
            <div>
              <label htmlFor="minutes" className="block text-sm font-medium text-slate-700">
                Tiempo al día ({minutes} min)
              </label>
              <input
                id="minutes"
                type="range"
                min={20}
                max={180}
                step={10}
                value={minutes}
                onChange={(event) => setMinutes(Number(event.target.value))}
                className="mt-3 w-full accent-teal-700"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep(0)}>
                Atrás
              </Button>
              <Button type="submit" loading={busy} className="flex-1">
                Entrar a Academic Ya!
              </Button>
            </div>
          </form>
        ) : null}
      </div>
    </OnboardingShell>
  );
}
