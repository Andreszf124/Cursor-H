import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert } from '../../../components/feedback/Alert';
import { Button } from '../../../components/ui/Button';
import { formatClock } from '../../schedule/lib/nextClass';
import { WeekdayScheduleFields } from '../../schedule/components/WeekdayScheduleFields';
import { timesAreValid, weekdayLabel } from '../../schedule/lib/weekdays';
import { scheduleService, type Schedule } from '../../schedule/services/scheduleService';

interface CourseScheduleEditorProps {
  courseId: string;
  schedules: Schedule[];
}

export function CourseScheduleEditor({ courseId, schedules }: CourseScheduleEditorProps) {
  const queryClient = useQueryClient();
  const [days, setDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['schedules'] });
    void queryClient.invalidateQueries({ queryKey: ['schedule-week'] });
  };

  const add = useMutation({
    mutationFn: async () => {
      if (days.length === 0 || !timesAreValid(startTime, endTime)) {
        throw new Error('Elige los días y un horario con fin posterior al inicio.');
      }
      for (const day of days) {
        await scheduleService.createSchedule({
          course_id: courseId,
          day_of_week: day,
          start_time: startTime,
          end_time: endTime,
          recurrence: 'weekly',
        });
      }
    },
    onSuccess: () => {
      setDays([]);
      setStartTime('');
      setEndTime('');
      refresh();
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => scheduleService.deleteSchedule(id),
    onSuccess: refresh,
  });

  const weekly = [...schedules].sort((left, right) => {
    const order = (day: number) => (day === 0 ? 7 : day);
    return order(left.day_of_week) - order(right.day_of_week) || left.start_time.localeCompare(right.start_time);
  });

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Horario semanal</h2>
        <p className="mt-1 text-xs text-slate-400">Marca los días y la hora. Puedes agregar más bloques o quitarlos.</p>
      </div>

      {weekly.length === 0 ? (
        <p className="text-sm text-slate-600">Este curso todavía no tiene días ni horario.</p>
      ) : (
        <ul className="space-y-2">
          {weekly.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <p className="text-slate-800">
                {weekdayLabel(item.day_of_week)} · {formatClock(item.start_time)} – {formatClock(item.end_time)}
              </p>
              <Button
                variant="secondary"
                onClick={() => remove.mutate(item.id)}
                loading={remove.isPending}
                aria-label={`Quitar ${weekdayLabel(item.day_of_week)}`}
              >
                Quitar
              </Button>
            </li>
          ))}
        </ul>
      )}

      <WeekdayScheduleFields
        idPrefix="edit-course"
        days={days}
        startTime={startTime}
        endTime={endTime}
        onDaysChange={setDays}
        onStartTimeChange={setStartTime}
        onEndTimeChange={setEndTime}
      />
      {add.error ? <Alert variant="error">{add.error.message}</Alert> : null}
      <Button
        onClick={() => add.mutate()}
        loading={add.isPending}
        disabled={days.length === 0 || !timesAreValid(startTime, endTime)}
      >
        Guardar horario
      </Button>
    </section>
  );
}
