import { ButtonLink } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';

const WEEKDAY_CHIPS = [
  { day: 1, label: 'L' },
  { day: 2, label: 'M' },
  { day: 3, label: 'X' },
  { day: 4, label: 'J' },
  { day: 5, label: 'V' },
  { day: 6, label: 'S' },
  { day: 0, label: 'D' },
] as const;

export interface CourseCardProps {
  to: string;
  name: string;
  professorName: string | null;
  color: string | null;
  classDays: number[];
  nextClassLabel: string | null;
  progress: number | null;
}

export function CourseCard({
  to,
  name,
  professorName,
  color,
  classDays,
  nextClassLabel,
  progress,
}: CourseCardProps) {
  const activeDays = new Set(classDays);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span
          className="mt-1 h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: color || '#4f46e5' }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-slate-900">{name}</h2>
          {professorName ? <p className="mt-0.5 text-sm text-slate-500">{professorName}</p> : null}
        </div>
      </div>

      {classDays.length > 0 ? (
        <p className="mt-4 flex flex-wrap gap-1" aria-label="Días de clase">
          {WEEKDAY_CHIPS.map((chip) => {
            const active = activeDays.has(chip.day);
            return (
              <span
                key={chip.label}
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                  active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-300'
                }`}
              >
                {chip.label}
              </span>
            );
          })}
        </p>
      ) : null}

      <p className="mt-3 text-sm text-slate-600">
        {nextClassLabel ? `Próxima clase: ${nextClassLabel}` : 'Sin horario registrado'}
      </p>

      {progress != null ? (
        <div className="mt-4">
          <ProgressBar value={progress} label="Progreso" />
        </div>
      ) : null}

      <div className="mt-5">
        <ButtonLink to={to} className="w-full">
          Entrar al curso
        </ButtonLink>
      </div>
    </article>
  );
}
