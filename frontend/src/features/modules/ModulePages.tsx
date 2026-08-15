import { SimpleListPage } from '../../components/SimpleListPage';
import { TutorWorkspace } from './TutorWorkspace';

export function MaterialsPage() {
  return (
    <SimpleListPage
      title="Materiales"
      queryKey="materials"
      path="/api/v1/materials"
      dataKey="materials"
      emptyText="Aún no hay materiales. Súbelos desde la API o amplía esta UI."
    />
  );
}

export function NotificationsPage() {
  return (
    <SimpleListPage
      title="Notificaciones"
      queryKey="notifications"
      path="/api/v1/notifications"
      dataKey="notifications"
      emptyText="Sin notificaciones."
    />
  );
}

export function CheckinsPage() {
  return (
    <SimpleListPage
      title="Check-ins"
      queryKey="checkins"
      path="/api/v1/checkins"
      dataKey="checkins"
      emptyText="Sin check-ins todavía."
    />
  );
}

export function GapsPage() {
  return (
    <SimpleListPage
      title="Brechas de conocimiento"
      queryKey="gaps"
      path="/api/v1/knowledge-gaps"
      dataKey="gaps"
      emptyText="Sin brechas abiertas."
    />
  );
}

export function TutorPage() {
  return <TutorWorkspace />;
}

export function ClassesPage() {
  return (
    <SimpleListPage
      title="Clases / Transcripciones"
      queryKey="transcripts"
      path="/api/v1/classes/transcripts"
      dataKey="transcripts"
      emptyText="Sin transcripciones."
    />
  );
}

export function LearningPlansPage() {
  return (
    <SimpleListPage
      title="Planes de aprendizaje"
      queryKey="learning-plans"
      path="/api/v1/learning-plans"
      dataKey="plans"
      emptyText="Sin planes. Genera uno con POST /api/v1/learning-plans."
    />
  );
}

export function ResourcesPage() {
  return (
    <SimpleListPage
      title="Recursos educativos"
      queryKey="resources"
      path="/api/v1/resources"
      dataKey="resources"
      emptyText="Sin recursos guardados."
    />
  );
}

export function PreparationPage() {
  return (
    <SimpleListPage
      title="Preparación próxima clase"
      queryKey="preparation"
      path="/api/v1/preparation/next"
      emptyText="Sin próxima clase detectada."
    />
  );
}

export function IntegrationsPage() {
  return (
    <SimpleListPage
      title="Integraciones"
      queryKey="integrations"
      path="/api/v1/integrations"
      dataKey="integrations"
      emptyText="Sin integraciones. Conecta campus o Teams sin enviar contraseñas."
    />
  );
}
