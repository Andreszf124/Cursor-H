export interface DemoCourse {
  name: string;
  subject: string;
  schedule: string;
  professor: string;
}

/** Cursos de ejemplo para el prototipo cuando no hay Graph ni extensión. */
export const DEMO_COURSES: DemoCourse[] = [
  {
    name: 'Cálculo I',
    subject: 'MAT-101',
    schedule: 'Lun y Mié 8:00–9:50',
    professor: 'Dra. Vargas',
  },
  {
    name: 'Programación I',
    subject: 'EIF-200',
    schedule: 'Mar y Jue 10:00–11:50',
    professor: 'MSc. Solano',
  },
  {
    name: 'Comunicación y lenguaje',
    subject: 'EG-1',
    schedule: 'Vie 13:00–16:50',
    professor: 'Lic. Méndez',
  },
];
