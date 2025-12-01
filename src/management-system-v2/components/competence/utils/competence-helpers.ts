/**
 * Helper utilities for competence matching
 */

/**
 * Checks if a competence ID is the special "overall" competence
 */
export function isOverallCompetence(competenceId: string): boolean {
  return competenceId.startsWith('__OVERALL__');
}
