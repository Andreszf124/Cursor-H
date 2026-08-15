import { WEEKDAYS } from '../lib/weekdays';

interface WeekdayScheduleFieldsProps {
  days: number[];
  startTime: string;
  endTime: string;
  onDaysChange: (days: number[]) => void;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
  idPrefix?: string;
}

export function WeekdayScheduleFields({
  days,
  startTime,
  endTime,
  onDaysChange,
  onStartTimeChange,
  onEndTimeChange,
  idPrefix = 'class',
}: WeekdayScheduleFieldsProps) {
  const selected = new Set(days);
  const startId = `${idPrefix}-start`;
  const endId = `${idPrefix}-end`;

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-slate-700">Días de clase</legend>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Días de la semana">
        {WEEKDAYS.map((day) => {
          const active = selected.has(day.value);
          return (
            <button
              key={day.value}
              type="button"
              aria-pressed={active}
              onClick={() =>
                onDaysChange(
                  active ? days.filter((item) => item !== day.value) : [...days, day.value],
                )
              }
              className={`rounded-lg border px-3 py-2 text-sm ${
                active
                  ? 'border-indigo-600 bg-indigo-50 font-medium text-indigo-800'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
              }`}
            >
              {day.short}
            </button>
          );
        })}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={startId} className="block text-sm font-medium text-slate-700">
            Hora de inicio
          </label>
          <input
            id={startId}
            type="time"
            value={startTime}
            onChange={(event) => onStartTimeChange(event.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <div>
          <label htmlFor={endId} className="block text-sm font-medium text-slate-700">
            Hora de fin
          </label>
          <input
            id={endId}
            type="time"
            value={endTime}
            onChange={(event) => onEndTimeChange(event.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
        </div>
      </div>
    </fieldset>
  );
}
