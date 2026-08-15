export interface ProductCapability {
  id: string;
  title: string;
  description: string;
  icon: 'courses' | 'checkin' | 'practice' | 'tutor' | 'progress';
}

export const PRODUCT_CAPABILITIES: ProductCapability[] = [
  {
    id: 'courses',
    icon: 'courses',
    title: 'Registrar cursos y horario',
    description:
      'Anota tus materias con los días y horas de clase. Academic Ya! sabe cuándo empieza y cuándo termina cada una.',
  },
  {
    id: 'checkin',
    icon: 'checkin',
    title: 'Check-in después de clase',
    description:
      'Cuando termina la clase, registras qué comprendiste. Esa evidencia es la base de todo lo demás.',
  },
  {
    id: 'practice',
    icon: 'practice',
    title: 'Practicar lo que se te traba',
    description:
      'Genera ejercicios sobre tus brechas, no sobre un temario genérico. Puedes retomar una práctica a medias.',
  },
  {
    id: 'tutor',
    icon: 'tutor',
    title: 'Preguntar al tutor',
    description:
      'Un tutor con el contexto de tus cursos y materiales. No inventa respuestas: si no hay evidencia, te lo dice.',
  },
  {
    id: 'progress',
    icon: 'progress',
    title: 'Ver tu dominio',
    description:
      'El progreso es por concepto, para saber qué reforzar antes del parcial y no solo un porcentaje vacío.',
  },
];
