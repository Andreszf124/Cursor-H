import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import App from '../../App';
import { AppShell } from '../../components/layout/AppShell';
import {
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
  ResetPasswordPage,
} from '../../features/auth';
import { AcademicHistoryPage, CareerSetupPage } from '../../features/career';
import { CourseDetailPage, CoursesPage } from '../../features/courses';
import { CheckinWizardPage } from '../../features/checkins/pages/CheckinWizardPage';
import { ImportPage } from '../../features/curriculum';
import {
  CheckinsPage,
  ClassesPage,
  GapsPage,
  IntegrationsPage,
  LearningPlansPage,
  MaterialsPage,
  NotificationsPage,
  PreparationPage,
  ResourcesPage,
} from '../../features/modules/ModulePages';
import { TutorPage } from '../../features/tutor/pages/TutorPage';
import { ProgressPage } from '../../features/progress/pages/ProgressPage';
import { PracticeHubPage } from '../../features/practice/pages/PracticeHubPage';
import { PracticeSessionPage } from '../../features/practice/pages/PracticeSessionPage';
import { CompletedOnboardingRedirect, OnboardingGate } from '../../features/onboarding';
import { CampusPreviewPage } from '../../features/onboarding/pages/CampusPreviewPage';
import { OnboardingWizard } from '../../features/onboarding/pages/OnboardingWizard';
import { ProfilePage } from '../../features/profile';
import { SchedulePage } from '../../features/schedule';
import { useAuthStore } from '../../stores/authStore';

function ProtectedRoute() {
  const session = useAuthStore((state) => state.session);
  return session ? <Outlet /> : <Navigate to="/login" replace />;
}

function GuestRoute() {
  const session = useAuthStore((state) => state.session);
  return session ? <Navigate to="/" replace /> : <Outlet />;
}

export const router = createBrowserRouter([
  { path: '/campus-preview', element: <CampusPreviewPage /> },
  {
    element: <GuestRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <CompletedOnboardingRedirect />,
        children: [{ path: '/onboarding', element: <OnboardingWizard /> }],
      },
      {
        element: <OnboardingGate />,
        children: [
          {
            element: <AppShell />,
            children: [
              { path: '/', element: <App /> },
              { path: '/profile', element: <ProfilePage /> },
              { path: '/career/setup', element: <CareerSetupPage /> },
              { path: '/career/history', element: <AcademicHistoryPage /> },
              { path: '/curriculum/import', element: <ImportPage /> },
              { path: '/courses', element: <CoursesPage /> },
              { path: '/courses/:courseId/checkin', element: <CheckinWizardPage /> },
              { path: '/courses/:courseId', element: <CourseDetailPage /> },
              { path: '/schedule', element: <SchedulePage /> },
              { path: '/materials', element: <MaterialsPage /> },
              { path: '/notifications', element: <NotificationsPage /> },
              { path: '/checkins', element: <CheckinsPage /> },
              { path: '/gaps', element: <GapsPage /> },
              { path: '/tutor', element: <TutorPage /> },
              { path: '/practice', element: <PracticeHubPage /> },
              { path: '/practice/:practiceId', element: <PracticeSessionPage /> },
              { path: '/progress', element: <ProgressPage /> },
              { path: '/classes', element: <ClassesPage /> },
              { path: '/learning-plans', element: <LearningPlansPage /> },
              { path: '/resources', element: <ResourcesPage /> },
              { path: '/preparation', element: <PreparationPage /> },
              { path: '/integrations', element: <IntegrationsPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
