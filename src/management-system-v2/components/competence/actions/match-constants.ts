/**
 * Constants for competence matching
 */

/* Score Color Thresholds */
export const SCORE_THRESHOLDS = {
  HIGH: 40, // >= -> green
  MEDIUM: 20, // >=  -> orange
  // <  -> red
} as const;

/* API Configuration */
export const API_URL = 'https://ai.raschke.cc/competence-matcher';
export const COMPETENCE_LIST_PATH = '/resource-competence-list/jobs';
export const MATCH_PATH = '/matching-task-to-resource/jobs';
