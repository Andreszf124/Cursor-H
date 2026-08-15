export interface ImportedCourse {
  name: string;
  subject: string;
  schedule: string;
  professor: string;
}

interface CourseImportPreviewProps {
  courses: ImportedCourse[];
  demo: boolean;
}

export function CourseImportPreview({ courses, demo }: CourseImportPreviewProps) {
  if (courses.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        No hay cursos importados. Podrás agregarlos después desde Cursos y Horario.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {demo && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Datos de demostración o de la pestaña de campus. Revisa nombres y horarios antes de
          confirmar.
        </p>
      )}
      <ul className="space-y-3">
        {courses.map((course) => (
          <li
            key={`${course.subject}-${course.name}`}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <p className="font-semibold text-slate-900">
              {course.subject} · {course.name}
            </p>
            <p className="mt-1 text-sm text-slate-600">{course.schedule}</p>
            <p className="text-sm text-slate-500">{course.professor}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
