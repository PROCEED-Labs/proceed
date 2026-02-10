import { SCORE_THRESHOLDS } from './match-constants';

/**
 * Returns the appropriate color for a match score based on thresholds
 * @param score - Score value between 0 and 100
 * @returns Color string for Ant Design (green, orange, red)
 */
export function getScoreColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.HIGH) {
    return '#52c41a'; // Green
  } else if (score >= SCORE_THRESHOLDS.MEDIUM) {
    return '#fa8c16'; // Orange
  } else {
    return '#ff4d4f'; // Red
  }
}

/**
 * Returns the semantic status for a match score
 * @param score - Score value between 0 and 100
 * @returns Status string (high, medium, low)
 */
export function getScoreStatus(score: number): 'high' | 'medium' | 'low' {
  if (score >= SCORE_THRESHOLDS.HIGH) {
    return 'high';
  } else if (score >= SCORE_THRESHOLDS.MEDIUM) {
    return 'medium';
  } else {
    return 'low';
  }
}
