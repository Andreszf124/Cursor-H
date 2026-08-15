/**
 * Contrato del proveedor de IA. La implementación real (NVIDIA NIM / Claude)
 * llega en una fase posterior; aquí vive un stub determinista para que el
 * resto del sistema (importación de plan de estudios, generación de material)
 * se pueda desarrollar y testear sin llamadas de red ni credenciales.
 */

export interface CurriculumExtraction {
  subjects: {
    code: string | null;
    name: string;
    credits: number;
    semester: number | null;
    is_elective: boolean;
  }[];
  prerequisites: { subject_code: string; prerequisite_code: string }[];
}

export interface GeneratedQuestion {
  question: string;
  options?: string[];
  answer?: string;
}

export interface AnswerEvaluation {
  correct: boolean;
  feedback: string;
  score: number;
}

export interface AIProvider {
  analyzeCurriculum(text: string): Promise<CurriculumExtraction>;
  analyzeContent(text: string, purpose: string): Promise<Record<string, unknown>>;
  generateText(prompt: string): Promise<string>;
  generateQuestions(context: string, count: number): Promise<GeneratedQuestion[]>;
  evaluateAnswer(question: string, answer: string, expected?: string): Promise<AnswerEvaluation>;
  embed(texts: string[]): Promise<number[][]>;
}

/** Líneas tipo "MAT-101 Cálculo I 4" (código, nombre, créditos) */
const SUBJECT_LINE =
  /^([A-Z]{2,4}\s?-?\s?\d{2,4})[\s.:|-]+(.+?)[\s.:|-]+(\d{1,2})(?:\s*(?:cr|créditos|creditos|créd|cred)\.?)?$/i;

/** Encabezados tipo "Semestre 3", "Ciclo II", "Año 2" */
const SEMESTER_HEADER = /^(?:semestre|ciclo|cuatrimestre|a[nñ]o|nivel)\s+([ivx]+|\d{1,2})\b/i;

/** Requisitos declarados en la misma línea: "req: MAT-101" */
const PREREQUISITE_HINT =
  /(?:requisitos?|prerrequisitos?|prerequisitos?|prereq|req)\s*:?\s*((?:[A-Z]{2,4}\s?-?\s?\d{2,4}[,;\s]*)+)/i;

const CODE_TOKEN = /[A-Z]{2,4}\s?-?\s?\d{2,4}/gi;

const ROMAN_NUMERALS: Record<string, number> = {
  i: 1,
  ii: 2,
  iii: 3,
  iv: 4,
  v: 5,
  vi: 6,
  vii: 7,
  viii: 8,
  ix: 9,
  x: 10,
};

interface CatalogEntry {
  code: string;
  name: string;
  credits: number;
  semester: number;
  is_elective: boolean;
  keywords: readonly string[];
  prerequisite_code?: string;
}

/**
 * Catálogo de respaldo: cuando el texto no trae líneas parseables, el stub
 * devuelve materias plausibles según palabras clave y longitud del documento.
 */
const FALLBACK_CATALOG: readonly CatalogEntry[] = [
  {
    code: 'MAT-101',
    name: 'Cálculo I',
    credits: 4,
    semester: 1,
    is_elective: false,
    keywords: ['calculo', 'matematica', 'matematicas', 'algebra'],
  },
  {
    code: 'INF-101',
    name: 'Programación I',
    credits: 4,
    semester: 1,
    is_elective: false,
    keywords: ['programacion', 'informatica', 'computacion', 'software'],
  },
  {
    code: 'FIS-101',
    name: 'Física I',
    credits: 3,
    semester: 1,
    is_elective: false,
    keywords: ['fisica', 'mecanica'],
  },
  {
    code: 'MAT-201',
    name: 'Cálculo II',
    credits: 4,
    semester: 2,
    is_elective: false,
    keywords: ['calculo ii', 'integral'],
    prerequisite_code: 'MAT-101',
  },
  {
    code: 'INF-201',
    name: 'Estructuras de Datos',
    credits: 4,
    semester: 2,
    is_elective: false,
    keywords: ['estructuras de datos', 'algoritmos'],
    prerequisite_code: 'INF-101',
  },
  {
    code: 'EST-301',
    name: 'Estadística',
    credits: 3,
    semester: 3,
    is_elective: false,
    keywords: ['estadistica', 'probabilidad'],
  },
  {
    code: 'ELE-401',
    name: 'Electiva Profesional',
    credits: 3,
    semester: 4,
    is_elective: true,
    keywords: ['electiva', 'optativa'],
  },
];

const CHARS_PER_FALLBACK_SUBJECT = 400;
const MAX_FALLBACK_SUBJECTS = 6;

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeCode(code: string): string {
  return code.replace(/\s+/g, '').toUpperCase();
}

function parseSemester(raw: string): number | null {
  const roman = ROMAN_NUMERALS[raw.toLowerCase()];
  if (roman !== undefined) return roman;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function isElectiveName(name: string): boolean {
  const normalized = normalize(name);
  return normalized.includes('electiva') || normalized.includes('optativa');
}

/** Extrae materias de líneas estructuradas del documento. */
function parseStructuredSubjects(text: string): CurriculumExtraction {
  const subjects: CurriculumExtraction['subjects'] = [];
  const prerequisites: CurriculumExtraction['prerequisites'] = [];
  const seen = new Set<string>();
  let currentSemester: number | null = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+/g, ' ').trim();
    if (line.length === 0 || line.length > 200) continue;

    const header = SEMESTER_HEADER.exec(line);
    if (header?.[1]) {
      currentSemester = parseSemester(header[1]);
      continue;
    }

    const hint = PREREQUISITE_HINT.exec(line);
    const subjectPart = hint ? line.slice(0, hint.index).trim() : line;
    const match = SUBJECT_LINE.exec(subjectPart);
    if (!match?.[1] || !match[2] || !match[3]) continue;

    const code = normalizeCode(match[1]);
    if (seen.has(code)) continue;
    seen.add(code);

    const name = match[2].trim();
    subjects.push({
      code,
      name,
      credits: Number.parseInt(match[3], 10),
      semester: currentSemester,
      is_elective: isElectiveName(name),
    });

    for (const token of hint?.[1]?.match(CODE_TOKEN) ?? []) {
      prerequisites.push({ subject_code: code, prerequisite_code: normalizeCode(token) });
    }
  }

  return { subjects, prerequisites };
}

/** Respaldo determinista: palabras clave del texto y, si no hay ninguna, su longitud. */
function buildFallbackExtraction(text: string): CurriculumExtraction {
  const normalized = normalize(text);
  let entries = FALLBACK_CATALOG.filter((entry) =>
    entry.keywords.some((keyword) => normalized.includes(keyword)),
  );

  if (entries.length === 0) {
    const count = Math.min(
      MAX_FALLBACK_SUBJECTS,
      Math.max(1, Math.floor(text.length / CHARS_PER_FALLBACK_SUBJECT)),
    );
    entries = FALLBACK_CATALOG.slice(0, count);
  }

  const codes = new Set(entries.map((entry) => entry.code));

  return {
    subjects: entries.map((entry) => ({
      code: entry.code,
      name: entry.name,
      credits: entry.credits,
      semester: entry.semester,
      is_elective: entry.is_elective,
    })),
    prerequisites: entries
      .filter((entry) => entry.prerequisite_code && codes.has(entry.prerequisite_code))
      .map((entry) => ({
        subject_code: entry.code,
        prerequisite_code: entry.prerequisite_code as string,
      })),
  };
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\r?\n+/)
    .map((sentence) => sentence.replace(/\s+/g, ' ').trim())
    .filter((sentence) => sentence.length > 15);
}

function topicFromContext(context: string): string {
  const fromLabel = context.match(/concepto:\s*(.+)/i)?.[1]?.split('\n')[0]?.trim();
  if (fromLabel) return fromLabel.slice(0, 80);
  const fromTopics = context.match(/temas de la clase:\s*(.+)/i)?.[1]?.split('\n')[0]?.trim();
  if (fromTopics) return fromTopics.slice(0, 80);
  const keywords = topKeywords(context, 3);
  if (keywords.length > 0) return keywords.join(' ');
  return 'el tema de la clase';
}

function questionForTopic(topic: string, index: number): GeneratedQuestion {
  const templates: GeneratedQuestion[] = [
    {
      question: `¿Cuál describe mejor ${topic}?`,
      options: [
        `Un concepto clave de ${topic}`,
        'Un dato sin relación con la clase',
        'Solo un ejemplo aislado',
        'Ninguna de las anteriores',
      ],
      answer: `Un concepto clave de ${topic}`,
    },
    {
      question: `Al practicar ${topic}, ¿qué conviene revisar primero?`,
      options: [
        `La idea central de ${topic}`,
        'Un tema de otro curso',
        'Solo la fecha del examen',
        'Ninguna de las anteriores',
      ],
      answer: `La idea central de ${topic}`,
    },
    {
      question: `Si ${topic} no quedó claro en clase, ¿qué sigue?`,
      options: [
        `Repasar ${topic} con un ejercicio corto`,
        'Ignorar el tema',
        'Cambiar de carrera',
        'Ninguna de las anteriores',
      ],
      answer: `Repasar ${topic} con un ejercicio corto`,
    },
    {
      question: `¿Para qué sirve dominar ${topic}?`,
      options: [
        `Para resolver problemas que usan ${topic}`,
        'Para memorizar sin entender',
        'Para saltarse la próxima clase',
        'Ninguna de las anteriores',
      ],
      answer: `Para resolver problemas que usan ${topic}`,
    },
    {
      question: `Una señal de que entendiste ${topic} es:`,
      options: [
        `Puedes explicar ${topic} con tus palabras`,
        'Copiar la definición sin leerla',
        'Dejar el cuaderno cerrado',
        'Ninguna de las anteriores',
      ],
      answer: `Puedes explicar ${topic} con tus palabras`,
    },
  ];
  const base = templates[index % templates.length]!;
  if (index < templates.length) return base;
  return {
    question: `${base.question} (variante ${index + 1})`,
    options: base.options,
    answer: base.answer,
  };
}

function topKeywords(text: string, limit: number): string[] {
  const counts = new Map<string, number>();
  for (const word of normalize(text).match(/[a-z]{5,}/g) ?? []) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word]) => word);
}

const EMBEDDING_DIMENSIONS = 8;

/**
 * Stub determinista: misma entrada → misma salida, sin red.
 * Se sustituye por el proveedor real sin tocar a los consumidores.
 */
class StubAIProvider implements AIProvider {
  analyzeCurriculum(text: string): Promise<CurriculumExtraction> {
    const structured = parseStructuredSubjects(text);
    if (structured.subjects.length > 0) {
      return Promise.resolve(structured);
    }
    return Promise.resolve(buildFallbackExtraction(text));
  }

  analyzeContent(text: string, purpose: string): Promise<Record<string, unknown>> {
    const sentences = splitSentences(text);
    return Promise.resolve({
      purpose,
      summary: sentences.slice(0, 3).join(' '),
      keywords: topKeywords(text, 5),
      characters: text.length,
      sentences: sentences.length,
    });
  }

  generateText(prompt: string): Promise<string> {
    const keywords = topKeywords(prompt, 3);
    const focus = keywords.length > 0 ? keywords.join(', ') : 'el tema solicitado';
    return Promise.resolve(
      `[stub] Respuesta generada sobre ${focus}. Configura un proveedor de IA real para obtener contenido completo.`,
    );
  }

  generateQuestions(context: string, count: number): Promise<GeneratedQuestion[]> {
    const topic = topicFromContext(context);
    const total = Math.max(0, Math.min(count, 20));
    return Promise.resolve(
      Array.from({ length: total }, (_, index) => questionForTopic(topic, index)),
    );
  }

  evaluateAnswer(question: string, answer: string, expected?: string): Promise<AnswerEvaluation> {
    const given = normalize(answer).trim();

    if (given.length === 0) {
      return Promise.resolve({
        correct: false,
        feedback: 'No se recibió respuesta.',
        score: 0,
      });
    }

    if (expected !== undefined) {
      const target = normalize(expected).trim();
      const correct = given === target;
      return Promise.resolve({
        correct,
        feedback: correct
          ? 'Coincide con la respuesta esperada.'
          : `Se esperaba algo cercano a: ${expected}`,
        score: correct ? 1 : 0,
      });
    }

    // Sin respuesta esperada el stub solo puede valorar el esfuerzo
    const score = Math.min(1, given.length / 120);
    return Promise.resolve({
      correct: score >= 0.5,
      feedback: `Respuesta registrada para "${question.slice(0, 60)}". Evaluación detallada requiere un proveedor de IA real.`,
      score: Math.round(score * 100) / 100,
    });
  }

  embed(texts: string[]): Promise<number[][]> {
    return Promise.resolve(
      texts.map((text) => {
        const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
        for (let index = 0; index < text.length; index += 1) {
          const position = index % EMBEDDING_DIMENSIONS;
          vector[position] = (vector[position] ?? 0) + text.charCodeAt(index);
        }
        const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
        return vector.map((value) => Math.round((value / norm) * 1e6) / 1e6);
      }),
    );
  }
}

let provider: AIProvider | null = null;

/** Punto único de acceso al proveedor de IA. */
export function getAIProvider(): AIProvider {
  provider ??= new StubAIProvider();
  return provider;
}

/** Permite inyectar un doble en tests de módulos que consumen IA. */
export function setAIProvider(next: AIProvider | null): void {
  provider = next;
}
