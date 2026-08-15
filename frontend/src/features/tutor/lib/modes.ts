export const TUTOR_MODES = [
  { id: 'explain', label: 'Explicar' },
  { id: 'rephrase', label: 'De otra forma' },
  { id: 'example', label: 'Ejemplos' },
  { id: 'analogy', label: 'Analogía' },
  { id: 'error', label: 'Corregir' },
] as const;

export type TutorModeId = (typeof TUTOR_MODES)[number]['id'];

export const TUTOR_SUGGESTIONS = [
  { text: 'Explícame lo más importante con mis apuntes', mode: 'explain' as const },
  { text: 'Dame un ejemplo concreto de lo que más se traba', mode: 'example' as const },
  { text: 'Explícalo con una analogía cotidiana', mode: 'analogy' as const },
];
