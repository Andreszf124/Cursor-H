import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { profileService } from '../../profile/services/profileService';

export function OnboardingGate() {
  const location = useLocation();
  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: profileService.getProfile,
  });

  if (profileQuery.isLoading) {
    return <p className="p-8 text-sm text-slate-500">Cargando tu perfil…</p>;
  }

  const completed = profileQuery.data?.onboarding_completed === true;
  if (!completed && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}

export function CompletedOnboardingRedirect() {
  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: profileService.getProfile,
  });

  if (profileQuery.isLoading) {
    return <p className="p-8 text-sm text-slate-500">Cargando…</p>;
  }

  if (profileQuery.data?.onboarding_completed) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
