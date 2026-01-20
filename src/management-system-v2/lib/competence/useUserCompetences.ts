'use client';

import { useQuery } from '@tanstack/react-query';
import { getUserCompetences } from '@/components/competence/actions/organization-competence-actions';

/**
 * Hook for polling user competences
 * Automatically refetches every 5 seconds and on window focus
 */
export function useUserCompetences(userId: string) {
  return useQuery({
    queryKey: ['userCompetences', userId],
    queryFn: async () => {
      const result = await getUserCompetences(userId);
      if (!result.success) {
        throw new Error(result.message);
      }
      return result.data;
    },
    refetchInterval: 5000, // Poll every 5 seconds
    enabled: !!userId, // Only fetch if userId is provided
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
