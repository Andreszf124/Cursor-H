import { useEffect, useRef, useState } from 'react';
import { Alert } from '../../../components/feedback/Alert';
import { Button } from '../../../components/ui/Button';
import type { ImportedCourse } from './CourseImportPreview';
import {
  CAMPUS_SCAN_REQUEST,
  CAMPUS_SCAN_RESULT,
  isCampusScanPayload,
} from '../lib/campusScan';

type ScanPhase = 'idle' | 'opened' | 'scanning' | 'done';

interface CampusScanPanelProps {
  campusLabel: string;
  onCourses: (courses: ImportedCourse[]) => void;
}

export function CampusScanPanel({ campusLabel, onCourses }: CampusScanPanelProps) {
  const tabRef = useRef<Window | null>(null);
  const onCoursesRef = useRef(onCourses);
  const [phase, setPhase] = useState<ScanPhase>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onCoursesRef.current = onCourses;
  }, [onCourses]);

  useEffect(() => {
    const onMessage = (event: MessageEvent): void => {
      if (event.origin !== window.location.origin) return;
      if (!isCampusScanPayload(event.data)) return;
      setPhase('done');
      setError(null);
      onCoursesRef.current(event.data.courses);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const openTab = (): void => {
    setError(null);
    const tab = window.open('/campus-preview', 'campus-scan', 'width=720,height=800');
    if (!tab) {
      setError('El navegador bloqueó la pestaña. Permite ventanas emergentes e inténtalo de nuevo.');
      return;
    }
    tabRef.current = tab;
    setPhase('opened');
  };

  const scanTab = (): void => {
    const tab = tabRef.current;
    if (!tab || tab.closed) {
      setError('La pestaña se cerró. Ábrela otra vez e inicia sesión ahí tú.');
      setPhase('idle');
      return;
    }
    setPhase('scanning');
    tab.focus();
    tab.postMessage({ type: CAMPUS_SCAN_REQUEST }, window.location.origin);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="font-semibold text-slate-900">Escanear {campusLabel}</h3>
      <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-600">
        <li>Abrimos una pestaña del campus. Tú inicias sesión ahí si hace falta.</li>
        <li>Cuando veas tus cursos, volvemos y escaneamos esa pestaña (scraping del DOM).</li>
        <li>Tú verificas los datos antes de guardarlos.</li>
      </ol>
      <Alert variant="info">
        No pedimos ni guardamos la contraseña del campus. El inicio de sesión ocurre solo en esa
        pestaña, en tu sesión.
      </Alert>
      {error && <Alert variant="error">{error}</Alert>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={openTab}>
          {phase === 'idle' ? 'Abrir pestaña del campus' : 'Reabrir pestaña'}
        </Button>
        <Button
          variant="secondary"
          disabled={phase === 'idle'}
          loading={phase === 'scanning'}
          onClick={scanTab}
        >
          Escanear pestaña
        </Button>
      </div>
      <p className="text-xs text-slate-400">
        Estado: {phase === 'idle' && 'esperando'}
        {phase === 'opened' && 'pestaña abierta — inicia sesión si te lo pide'}
        {phase === 'scanning' && 'leyendo cursos de la pestaña'}
        {phase === 'done' && `recibido (${CAMPUS_SCAN_RESULT})`}
      </p>
    </div>
  );
}
