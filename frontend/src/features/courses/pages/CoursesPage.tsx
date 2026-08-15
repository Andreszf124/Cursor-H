import { useQuery } from '@tanstack/react-query';
import { CourseCard } from '../../../components/courses/CourseCard';
import { Alert } from '../../../components/feedback/Alert';
import { careerService } from '../../career/services/careerService';
import { progressService } from '../../progress/services/progressService';
import { average, findNextClass, formatClassWhen } from '../../schedule/lib/nextClass';
import { scheduleService } from '../../schedule/services/scheduleService';
import { AddCoursePanel } from '../components/CourseDocuments';
import { coursesService } from '../services/coursesService';

export function CoursesPage() {
  const periodsQuery = useQuery({ queryKey: ['academic-periods'], queryFn: careerService.listPeriods });
  const activePeriod = (periodsQuery.data?.periods ?? []).find((period) => period.is_active);
  const coursesQuery = useQuery({
    queryKey: ['courses', activePeriod?.id ?? 'all'],
    queryFn: () => coursesService.listCourses(activePeriod?.id),
    enabled: !periodsQuery.isPending,
  });
  const schedulesQuery = useQuery({
    queryKey: ['schedules'],
    queryFn: scheduleService.listSchedules,
  });
  const masteryQuery = useQuery({
    queryKey: ['progress-concepts'],
    queryFn: () => progressService.byConcept(),
  });

  const courses = coursesQuery.data?.courses ?? [];
  const schedules = schedulesQuery.data?.schedules ?? [];
  const mastery = masteryQuery.data?.concepts ?? [];
  const loading = periodsQuery.isLoading || coursesQuery.isLoading;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Mis cursos</h1>
        <p className="mt-1 text-sm text-slate-500">
          Agrega cada materia por su nombre. Los documentos se suben al curso y se pueden editar después.
        </p>
      </header>

      <AddCoursePanel courseCount={courses.length} />

      {coursesQuery.error || periodsQuery.error ? (
        <Alert variant="error">No se pudieron cargar tus cursos.</Alert>
      ) : null}

      {loading ? <p className="text-sm text-slate-500">Cargando cursos…</p> : null}

      {!loading && courses.length === 0 ? (
        <p className="text-sm text-slate-600">Todavía no hay cursos. Escribe el nombre arriba para crear el primero.</p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {courses.map((course) => {
          const courseSchedules = schedules.filter((item) => item.course_id === course.id);
          const next = findNextClass(courseSchedules);
          const courseMastery = average(
            mastery.filter((item) => item.course_id === course.id).map((item) => item.mastery_percentage),
          );

          return (
            <CourseCard
              key={course.id}
              to={`/courses/${course.id}`}
              name={course.name}
              professorName={course.professor?.name ?? null}
              color={course.color}
              classDays={[...new Set(courseSchedules.map((item) => item.day_of_week))]}
              nextClassLabel={next ? formatClassWhen(next.startsAt) : null}
              progress={courseMastery}
            />
          );
        })}
      </div>
    </div>
  );
}
