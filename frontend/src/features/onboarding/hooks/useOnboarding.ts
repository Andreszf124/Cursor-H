import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { careerService } from '../../career/services/careerService';
import { profileService } from '../../profile/services/profileService';
import { onboardingService } from '../services/onboardingService';

export function useOnboarding() {
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: profileService.getProfile,
  });

  const complete = useMutation({
    mutationFn: onboardingService.complete,
    onSuccess: (profile) => {
      queryClient.setQueryData(['profile'], profile);
    },
  });

  return {
    profileQuery,
    complete,
    careerService,
    profileService,
    onboardingService,
  };
}
