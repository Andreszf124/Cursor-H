export const START_MENU = [
  {
    to: '/courses',
    label: 'Mis cursos',
    hint: 'Agrega materias, horario y materiales',
  },
  {
    to: '/practice',
    label: 'Práctica',
    hint: 'Genera ejercicios de lo que se te traba',
  },
  {
    to: '/tutor',
    label: 'Tutor IA',
    hint: 'Pregunta con el contexto de tus clases',
  },
  {
    to: '/schedule',
    label: 'Calendario',
    hint: 'Revisa tu semana de clases',
  },
  {
    to: '/progress',
    label: 'Progreso',
    hint: 'Mira el dominio por concepto',
  },
] as const;

export function practiceHref(courseId?: string | null, conceptId?: string | null): string {
  const params = new URLSearchParams();
  if (courseId) params.set('course', courseId);
  if (conceptId) params.set('concept', conceptId);
  const query = params.toString();
  return query ? `/practice?${query}` : '/practice';
}
