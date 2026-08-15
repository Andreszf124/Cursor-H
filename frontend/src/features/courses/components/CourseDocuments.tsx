import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert } from '../../../components/feedback/Alert';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { careerService } from '../../career/services/careerService';
import { MATERIAL_LABELS, materialsService, type Material } from '../../learning/services/learningService';
import { WeekdayScheduleFields } from '../../schedule/components/WeekdayScheduleFields';
import { timesAreValid } from '../../schedule/lib/weekdays';
import { scheduleService } from '../../schedule/services/scheduleService';
import { coursesService } from '../services/coursesService';

const ACCEPT = '.pdf,.png,.jpg,.jpeg,.docx,application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const COURSE_COLORS = ['#0F766E', '#1D4ED8', '#B45309', '#9F1239', '#6D28D9', '#334155'];

interface AddCoursePanelProps {
  courseCount: number;
}

function fileTitle(file: File): string {
  return file.name.replace(/\.[^.]+$/, '').slice(0, 200);
}

export function AddCoursePanel({ courseCount }: AddCoursePanelProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [days, setDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      if (days.length === 0 || !timesAreValid(startTime, endTime)) {
        throw new Error('Elige los días de clase y un horario con fin posterior al inicio.');
      }
      const period = await careerService.ensureActivePeriod();
      const course = await coursesService.createCourse({
        name: name.trim(),
        academic_period_id: period.id,
        modality: 'in_person',
        color: COURSE_COLORS[courseCount % COURSE_COLORS.length],
      });
      for (const day of days) {
        await scheduleService.createSchedule({
          course_id: course.id,
          day_of_week: day,
          start_time: startTime,
          end_time: endTime,
          recurrence: 'weekly',
        });
      }
      const failed: string[] = [];
      for (const file of files) {
        try {
          await materialsService.upload(file, { course_id: course.id, title: fileTitle(file) });
        } catch {
          failed.push(file.name);
        }
      }
      if (failed.length > 0) {
        throw new Error(
          `El curso y el horario se guardaron, pero no se subieron: ${failed.join(', ')}. Entra al curso y súbelos de nuevo.`,
        );
      }
      return { course, documentCount: files.length, dayCount: days.length };
    },
    onMutate: () => {
      setSavedMessage(null);
    },
    onSuccess: (result) => {
      setName('');
      setFiles([]);
      setDays([]);
      setStartTime('');
      setEndTime('');
      setSavedMessage(
        `${result.course.name} se guardó con ${result.dayCount} ${result.dayCount === 1 ? 'día' : 'días'} de clase.`,
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['courses'] });
      void queryClient.invalidateQueries({ queryKey: ['academic-periods'] });
      void queryClient.invalidateQueries({ queryKey: ['schedules'] });
      void queryClient.invalidateQueries({ queryKey: ['schedule-week'] });
      void queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
  });

  const canSubmit =
    name.trim().length >= 2 && days.length > 0 && timesAreValid(startTime, endTime) && !create.isPending;

  return (
    <form
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) create.mutate();
      }}
    >
      <h2 className="font-semibold text-slate-900">Agregar curso</h2>
      <p className="text-sm text-slate-500">
        Nombre, días y horario. Los documentos se pueden subir ahora o después.
      </p>
      <Input
        id="new-course-name"
        label="Nombre del curso"
        placeholder="Ej. Cálculo I"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <WeekdayScheduleFields
        idPrefix="new-course"
        days={days}
        startTime={startTime}
        endTime={endTime}
        onDaysChange={setDays}
        onStartTimeChange={setStartTime}
        onEndTimeChange={setEndTime}
      />
      <div>
        <label htmlFor="new-course-files" className="block text-sm font-medium text-slate-700">
          Documentos (opcional)
        </label>
        <input
          id="new-course-files"
          type="file"
          multiple
          accept={ACCEPT}
          className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700"
          onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
        />
        <p className="mt-1 text-xs text-slate-500">PDF, Word o imagen. Hasta 10 MB cada uno.</p>
        {files.length > 0 ? (
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {files.map((file) => (
              <li key={file.name}>{file.name}</li>
            ))}
          </ul>
        ) : null}
      </div>
      {create.error ? <Alert variant="error">{create.error.message}</Alert> : null}
      {savedMessage && !create.error ? <Alert variant="success">{savedMessage}</Alert> : null}
      <Button type="submit" loading={create.isPending} disabled={!canSubmit}>
        Agregar curso
      </Button>
    </form>
  );
}

interface CourseDocumentsProps {
  courseId: string;
  materials: Material[];
}

export function CourseDocuments({ courseId, materials }: CourseDocumentsProps) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['materials', courseId] });
  };

  const upload = useMutation({
    mutationFn: async (fileList: File[]) => {
      for (const file of fileList) {
        await materialsService.upload(file, { course_id: courseId, title: fileTitle(file) });
      }
    },
    onSuccess: refresh,
  });
  const rename = useMutation({
    mutationFn: () => materialsService.update(editingId!, { title: title.trim() }),
    onSuccess: () => {
      setEditingId(null);
      setTitle('');
      refresh();
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => materialsService.remove(id),
    onSuccess: refresh,
  });
  const open = useMutation({
    mutationFn: (id: string) => materialsService.signedUrl(id),
    onSuccess: (result) => {
      window.open(result.url, '_blank', 'noopener,noreferrer');
    },
  });

  const error = upload.error ?? rename.error ?? remove.error ?? open.error;

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Documentos del curso
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Archivos que subes tú. Puedes agregar más o cambiar el nombre cuando quieras.
        </p>
      </div>

      <div>
        <label htmlFor={`docs-${courseId}`} className="block text-sm font-medium text-slate-700">
          Subir documento
        </label>
        <input
          id={`docs-${courseId}`}
          type="file"
          multiple
          accept={ACCEPT}
          className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700"
          onChange={(event) => {
            const next = Array.from(event.target.files ?? []);
            event.target.value = '';
            if (next.length > 0) upload.mutate(next);
          }}
        />
      </div>

      {upload.isPending ? <p className="text-sm text-slate-500">Subiendo…</p> : null}
      {error ? <Alert variant="error">{error.message}</Alert> : null}

      {materials.length === 0 && !upload.isPending ? (
        <p className="text-sm text-slate-600">Aún no hay documentos en este curso.</p>
      ) : (
        <ul className="space-y-3">
          {materials.map((material) => {
            const isEditing = editingId === material.id;
            return (
              <li key={material.id} className="rounded-lg border border-slate-200 px-3 py-3">
                {isEditing ? (
                  <form
                    className="flex flex-wrap items-end gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (title.trim()) rename.mutate();
                    }}
                  >
                    <Input
                      id={`rename-${material.id}`}
                      label="Nombre"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      className="min-w-[12rem] flex-1"
                    />
                    <Button type="submit" loading={rename.isPending} disabled={title.trim().length < 1}>
                      Guardar
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setEditingId(null);
                        setTitle('');
                      }}
                    >
                      Cancelar
                    </Button>
                  </form>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{material.title}</p>
                      <p className="text-xs text-slate-500">
                        {MATERIAL_LABELS[material.category] ?? material.category}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => open.mutate(material.id)}
                        loading={open.isPending}
                      >
                        Abrir
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setEditingId(material.id);
                          setTitle(material.title);
                        }}
                      >
                        Cambiar nombre
                      </Button>
                      <Button
                        variant="danger"
                        loading={remove.isPending}
                        onClick={() => remove.mutate(material.id)}
                      >
                        Quitar
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
