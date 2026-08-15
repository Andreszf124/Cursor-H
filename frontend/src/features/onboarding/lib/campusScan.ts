import type { ImportedCourse } from '../components/CourseImportPreview';

export const CAMPUS_SCAN_RESULT = 'academic-copilot:campus-scan';
export const CAMPUS_SCAN_REQUEST = 'academic-copilot:please-scan';

export interface CampusScanPayload {
  type: typeof CAMPUS_SCAN_RESULT;
  courses: ImportedCourse[];
  source: string;
}

function text(el: Element | null): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** Extrae cursos del DOM de la pestaña abierta (sesión del estudiante, sin contraseña). */
export function scrapeCampusDocument(doc: Document): ImportedCourse[] {
  const tagged = [...doc.querySelectorAll('[data-course-name]')].map((node) => ({
    name: node.getAttribute('data-course-name')?.trim() || text(node.querySelector('[data-field="name"]')),
    subject: node.getAttribute('data-course-code')?.trim() || text(node.querySelector('[data-field="code"]')),
    schedule: node.getAttribute('data-course-schedule')?.trim() || text(node.querySelector('[data-field="schedule"]')),
    professor: node.getAttribute('data-course-professor')?.trim() || text(node.querySelector('[data-field="professor"]')),
  }));
  if (tagged.length > 0) {
    return tagged.filter((course) => course.name.length > 0);
  }

  const moodleLinks = [...doc.querySelectorAll('.coursename a, .course-listitem .coursename')];
  if (moodleLinks.length > 0) {
    return moodleLinks
      .map((link) => ({
        name: text(link),
        subject: '—',
        schedule: 'Horario no publicado en esta vista',
        professor: '—',
      }))
      .filter((course) => course.name.length > 0);
  }

  return [];
}

export function isCampusScanPayload(data: unknown): data is CampusScanPayload {
  if (!data || typeof data !== 'object') return false;
  const payload = data as CampusScanPayload;
  if (payload.type !== CAMPUS_SCAN_RESULT || !Array.isArray(payload.courses)) return false;
  return payload.courses.every(
    (course) =>
      course &&
      typeof course.name === 'string' &&
      typeof course.subject === 'string' &&
      typeof course.schedule === 'string' &&
      typeof course.professor === 'string',
  );
}

export function buildScanResult(doc: Document): CampusScanPayload {
  return {
    type: CAMPUS_SCAN_RESULT,
    courses: scrapeCampusDocument(doc),
    source: doc.location?.href ?? '',
  };
}
