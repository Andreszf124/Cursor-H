import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { WeekdayScheduleFields } from '../../schedule/components/WeekdayScheduleFields';
import { timesAreValid, weekdayLabel } from '../../schedule/lib/weekdays';

export interface CourseDraft {
  localId: string;
  name: string;
  files: File[];
  days: number[];
  startTime: string;
  endTime: string;
}

interface CourseDraftListProps {
  drafts: CourseDraft[];
  onAdd: (draft: CourseDraft) => void;
  onRemove: (localId: string) => void;
  busy: boolean;
  onSkip: () => void;
  onContinue: () => void;
}

function scheduleSummary(draft: CourseDraft): string {
  if (draft.days.length === 0 || !draft.startTime || !draft.endTime) {
    return 'Sin horario todavía';
  }
  const days = [...draft.days]
    .sort((left, right) => (left === 0 ? 7 : left) - (right === 0 ? 7 : right))
    .map((day) => weekdayLabel(day))
    .join(', ');
  return `${days} · ${draft.startTime} – ${draft.endTime}`;
}

export function CourseDraftList({
  drafts,
  onAdd,
  onRemove,
  busy,
  onSkip,
  onContinue,
}: CourseDraftListProps) {
  const [name, setName] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [days, setDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const canAdd = name.trim().length >= 2 && days.length > 0 && timesAreValid(startTime, endTime);

  const addCourse = (): void => {
    if (!canAdd) return;
    onAdd({
      localId: `${name.trim()}-${drafts.length}`,
      name: name.trim(),
      files,
      days,
      startTime,
      endTime,
    });
    setName('');
    setFiles([]);
    setDays([]);
    setStartTime('');
    setEndTime('');
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Tus cursos</h1>
        <p className="mt-2 text-sm text-slate-600">
          Nombre, días y horario de cada materia. Los documentos se pueden subir ahora o después.
        </p>
      </header>

      <form
        className="space-y-4 rounded-xl border border-stone-200 bg-stone-50 p-4 sm:p-5"
        onSubmit={(event) => {
          event.preventDefault();
          addCourse();
        }}
      >
        <Input
          id="course-name"
          label="Nombre del curso"
          placeholder="Ej. Cálculo I"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <WeekdayScheduleFields
          idPrefix="onboarding-course"
          days={days}
          startTime={startTime}
          endTime={endTime}
          onDaysChange={setDays}
          onStartTimeChange={setStartTime}
          onEndTimeChange={setEndTime}
        />
        <div>
          <label htmlFor="course-files" className="block text-sm font-medium text-slate-700">
            Documentos (opcional)
          </label>
          <input
            id="course-files"
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.docx,application/pdf,image/png,image/jpeg"
            className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700"
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          />
        </div>
        <Button type="submit" variant="secondary" disabled={!canAdd} className="w-full sm:w-auto">
          Agregar curso
        </Button>
      </form>

      {drafts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-white px-4 py-6 text-sm text-slate-600">
          Todavía no hay cursos. Agrégalos aquí o continúa y regístralos después en Mis cursos.
        </p>
      ) : (
        <ul className="space-y-2">
          {drafts.map((draft) => (
            <li
              key={draft.localId}
              className="flex items-start justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3"
            >
              <div>
                <p className="font-medium text-slate-900">{draft.name}</p>
                <p className="mt-0.5 text-sm text-slate-500">{scheduleSummary(draft)}</p>
                {draft.files.length > 0 ? (
                  <p className="mt-0.5 text-sm text-slate-500">
                    {draft.files.length} {draft.files.length === 1 ? 'documento' : 'documentos'}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className="text-sm text-slate-500 hover:text-red-700"
                aria-label={`Quitar ${draft.name}`}
                onClick={() => onRemove(draft.localId)}
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onSkip} disabled={busy}>
          Los agregaré después
        </Button>
        <Button loading={busy} onClick={onContinue}>
          {drafts.length > 0 ? 'Guardar cursos' : 'Continuar'}
        </Button>
      </div>
    </div>
  );
}
