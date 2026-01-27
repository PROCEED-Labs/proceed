'use client';

import { useQuery } from '@tanstack/react-query';
import { getOrganizationSpaceCompetences } from '@/components/competence/actions/organization-competence-actions';

/**
 * Hook for polling organization space competences
 * Automatically refetches every 5 seconds and on window focus
 */
export function useOrganizationSpaceCompetences(spaceId: string) {
  return useQuery({
    queryKey: ['organizationSpaceCompetences', spaceId],
    queryFn: async () => {
      const result = await getOrganizationSpaceCompetences(spaceId);
      if (!result.success) {
        throw new Error(result.message);
      }
      return result.data;
    },
    refetchInterval: 5000, // Poll every 5 seconds
    enabled: !!spaceId, // Only fetch if spaceId is provided
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
