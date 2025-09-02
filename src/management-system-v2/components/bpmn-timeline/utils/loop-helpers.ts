/**
 * Utility functions for handling loop status in timing instances
 */

/**
 * Merge loop status from multiple timing instances of the same element
 * Prioritizes loop cut over regular loop status
 */
export function mergeLoopStatus(
  timingInstances: Array<{ isLoop?: boolean; isLoopCut?: boolean }>,
): {
  isLoop: boolean;
  isLoopCut: boolean;
} {
  const hasLoopCut = timingInstances.some((t) => t.isLoopCut);
  const hasLoop = timingInstances.some((t) => t.isLoop) && !hasLoopCut; // Prioritize loop cut

  return {
    isLoop: hasLoop,
    isLoopCut: hasLoopCut,
  };
}

/**
 * Apply merged loop status to a timing instance
 */
export function applyLoopStatus(
  timing: any,
  timingInstances: Array<{ isLoop?: boolean; isLoopCut?: boolean }>,
): void {
  const { isLoop, isLoopCut } = mergeLoopStatus(timingInstances);
  timing.isLoop = isLoop;
  timing.isLoopCut = isLoopCut;
}
