/**
 * Constants for competence matching
 */

import { getMSConfig } from '@/lib/ms-config/ms-config';

/* Score Color Thresholds */
export const SCORE_THRESHOLDS = {
  HIGH: 45, // >= -> green
  MEDIUM: 20, // >=  -> orange
  // <  -> red
} as const;

/* API Configuration */
export async function getCompetenceMatchingAPIConfig() {
  const config = await getMSConfig();
  return {
    API_URL: config.PROCEED_PUBLIC_COMPETENCE_MATCHING_SERVICE_URL,
    COMPETENCE_LIST_PATH: config.PROCEED_PUBLIC_COMPETENCE_MATCHING_SERVICE_COMPETENCE_LIST_PATH,
    MATCH_PATH: config.PROCEED_PUBLIC_COMPETENCE_MATCHING_SERVICE_MATCH_PATH,
  };
}
