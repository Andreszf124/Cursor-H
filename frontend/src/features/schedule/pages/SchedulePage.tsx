import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert } from '../../../components/feedback/Alert';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { coursesService } from '../../courses/services/coursesService';
import { scheduleService } from '../services/scheduleService';

/** Lunes → domingo, con el day_of_week que usa el backend (0 = domingo) */
const WEEK_DAYS = [
  { label: 'Lunes', dayOfWeek: 1 },
  { label: 'Martes', dayOfWeek: 2 },
  { label: 'Miércoles', dayOfWeek: 3 },
  { label: 'Jueves', dayOfWeek: 4 },
  { label: 'Viernes', dayOfWeek: 5 },
  { label: 'Sábado', dayOfWeek: 6 },
  { label: 'Domingo', dayOfWeek: 0 },
] as const;

function toISODate(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function shiftDays(isoDate: string, days: number): string {
  const [year = '1970', month = '01', day = '01'] = isoDate.split('-');
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function SchedulePage() {
  const queryClient = useQueryClient();
  const [week, setWeek] = useState(() => toISODate(new Date()));
  const [courseId, setCourseId] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('10:00');

  const weekQuery = useQuery({
    queryKey: ['schedule-week', week],
    queryFn: () => scheduleService.getWeek(week),
  });
  const upcomingQuery = useQuery({
    queryKey: ['schedules-upcoming'],
    queryFn: scheduleService.getUpcoming,
  });
  const coursesQuery = useQuery({ queryKey: ['courses'], queryFn: () => coursesService.listCourses() });

  const createSchedule = useMutation({
    mutationFn: () =>
      scheduleService.createSchedule({
        course_id: courseId,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['schedule-week'] });
      void queryClient.invalidateQueries({ queryKey: ['schedules-upcoming'] });
    },
  });

  const courses = coursesQuery.data?.courses ?? [];
  const upcoming = upcomingQuery.data?.upcoming ?? [];
  const schedules = weekQuery.data?.schedules ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Horario semanal</h1>

      {upcoming.length > 0 && (
        <Alert variant="info">
          {upcoming.length === 1
            ? `${upcoming[0]?.course?.name ?? 'Una clase'} termina en ${upcoming[0]?.ends_in_minutes} min: registra tu check-in.`
            : `${upcoming.length} clases terminan en los próximos 30 minutos.`}
        </Alert>
      )}

      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <Button variant="secondary" onClick={() => setWeek(shiftDays(week, -7))}>
          Semana anterior
        </Button>
        <p className="text-sm text-slate-600">
          {weekQuery.data
            ? `${weekQuery.data.week_start} → ${weekQuery.data.week_end}`
            : 'Cargando semana…'}
        </p>
        <Button variant="secondary" onClick={() => setWeek(shiftDays(week, 7))}>
          Semana siguiente
        </Button>
      </div>

      {weekQuery.error && <Alert variant="error">No se pudo cargar el horario.</Alert>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {WEEK_DAYS.map((day) => {
          const slots = schedules
            .filter((slot) => slot.day_of_week === day.dayOfWeek)
            .sort((a, b) => a.start_time.localeCompare(b.start_time));

          return (
            <section
              key={day.label}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <h2 className="font-semibold text-slate-800">{day.label}</h2>
              <ul className="mt-2 space-y-2 text-sm">
                {slots.map((slot) => (
                  <li
                    key={`${slot.id}-${slot.date}`}
                    className="rounded-lg border-l-4 bg-slate-50 px-2 py-1"
                    style={{ borderLeftColor: slot.course?.color ?? '#4f46e5' }}
                  >
                    <p className="font-medium text-slate-900">{slot.course?.name ?? 'Curso'}</p>
                    <p className="text-slate-600">
                      {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                    </p>
                    {slot.classroom && (
                      <p className="text-slate-500">{slot.classroom.name}</p>
                    )}
                  </li>
                ))}
                {slots.length === 0 && <li className="text-slate-400">Sin clases</li>}
              </ul>
            </section>
          );
        })}
      </div>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Agregar bloque de horario</h2>
        <div>
          <label htmlFor="schedule-course" className="block text-sm font-medium text-slate-700">
            Curso
          </label>
          <select
            id="schedule-course"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
          >
            <option value="">Selecciona un curso</option>
            {courses.map((course) => (
              <option key={String(course.id)} value={String(course.id)}>
                {String(course.name)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="schedule-day" className="block text-sm font-medium text-slate-700">
            Día
          </label>
          <select
            id="schedule-day"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={dayOfWeek}
            onChange={(event) => setDayOfWeek(Number(event.target.value))}
          >
            {WEEK_DAYS.map((day) => (
              <option key={day.label} value={day.dayOfWeek}>
                {day.label}
              </option>
            ))}
          </select>
        </div>
        <Input
          id="schedule-start"
          type="time"
          label="Hora de inicio"
          value={startTime}
          onChange={(event) => setStartTime(event.target.value)}
        />
        <Input
          id="schedule-end"
          type="time"
          label="Hora de fin"
          value={endTime}
          onChange={(event) => setEndTime(event.target.value)}
        />
        {createSchedule.error && <Alert variant="error">{createSchedule.error.message}</Alert>}
        <Button
          loading={createSchedule.isPending}
          disabled={!courseId || endTime <= startTime}
          onClick={() => createSchedule.mutate()}
        >
          Agregar al horario
        </Button>
      </section>
    </div>
  );
}
