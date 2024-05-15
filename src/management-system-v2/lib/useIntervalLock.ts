import { useCallback, useRef } from 'react';

/**
 * A hook that returns a function that can be invoked at most once per interval.
 */
export const useIntervalLock = (
  func: ((...args: any[]) => any) | undefined = () => {},
  interval: number,
) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const invoke = useCallback(
    (...args: any[]) => {
      if (timeoutRef.current === null) {
        func(...args);
        timeoutRef.current = setTimeout(() => {
          timeoutRef.current = null;
        }, interval);
      }
    },
    [func, interval],
  );

  return invoke;
};
