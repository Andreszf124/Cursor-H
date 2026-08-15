import { useEffect } from 'react';
import { buildScanResult, CAMPUS_SCAN_REQUEST, CAMPUS_SCAN_RESULT } from '../lib/campusScan';

const SAMPLE_COURSES = [
  {
    code: 'MAT-101',
    name: 'Cálculo I',
    schedule: 'Lun y Mié 8:00–9:50',
    professor: 'Dra. Vargas',
  },
  {
    code: 'EIF-200',
    name: 'Programación I',
    schedule: 'Mar y Jue 10:00–11:50',
    professor: 'MSc. Solano',
  },
  {
    code: 'EG-1',
    name: 'Comunicación y lenguaje',
    schedule: 'Vie 13:00–16:50',
    professor: 'Lic. Méndez',
  },
];

function postScan(): void {
  if (!window.opener) return;
  const result = buildScanResult(document);
  window.opener.postMessage(result, window.location.origin);
}

export function CampusPreviewPage() {
  useEffect(() => {
    const onMessage = (event: MessageEvent): void => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === CAMPUS_SCAN_REQUEST) {
        postScan();
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
          Vista de campus (prototipo)
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Mis cursos — I ciclo</h1>
        <p className="mt-2 text-sm text-slate-600">
          En la universidad real tú iniciarías sesión en esta pestaña. Academic Ya! no ve tu
          contraseña: solo lee los cursos visibles cuando pulsas escanear.
        </p>
        <ul className="mt-6 space-y-3">
          {SAMPLE_COURSES.map((course) => (
            <li
              key={course.code}
              data-course-name={course.name}
              data-course-code={course.code}
              data-course-schedule={course.schedule}
              data-course-professor={course.professor}
              className="rounded-xl border border-slate-200 p-4"
            >
              <p className="font-semibold text-slate-900">
                {course.code} · {course.name}
              </p>
              <p data-field="schedule" className="text-sm text-slate-600">
                {course.schedule}
              </p>
              <p data-field="professor" className="text-sm text-slate-500">
                {course.professor}
              </p>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="mt-6 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
          onClick={postScan}
        >
          Enviar cursos a Academic Ya!
        </button>
        <p className="mt-3 text-xs text-slate-400">mensaje: {CAMPUS_SCAN_RESULT}</p>
      </div>
    </main>
  );
}
