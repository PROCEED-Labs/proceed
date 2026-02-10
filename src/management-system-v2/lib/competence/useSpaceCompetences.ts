'use client';

import { useQuery } from '@tanstack/react-query';

/**
 * Hook for polling space competences from API endpoint
 * Automatically refetches every 5 seconds and on window focus
 */
export function useSpaceCompetences(spaceId: string) {
  return useQuery({
    queryKey: ['spaceCompetences', spaceId],
    queryFn: async () => {
      const response = await fetch(`/api/spaces/${spaceId}/competences`);
      if (!response.ok) {
        throw new Error('Failed to load space competences');
      }
      return response.json();
    },
    refetchInterval: 5000, // Poll every 5 seconds
    enabled: !!spaceId, // Only fetch if spaceId is provided
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
