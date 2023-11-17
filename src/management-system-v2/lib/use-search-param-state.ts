/*
 * For now this hook is needed, as router.replace causes a hard reload https://github.com/vercel/next.js/discussions/48110
 */

import { useEffect, useState } from 'react';

type ReplaceStateEvent = Event & { arguments: Parameters<typeof history.replaceState> };

export function useSearchParamState<T extends string>(
  paramName: string,
): [T | undefined, (newValue: T | undefined) => void] {
  // Get the initial value from the URL search parameter or use the provided initial value.
  const initialQueryParam =
    typeof window !== 'undefined'
      ? (new URLSearchParams(window.location.search).get(paramName) as T) ?? undefined
      : undefined;

  const [state, setState] = useState<T | undefined>(initialQueryParam);

  useEffect(() => {
    const replaceStateListener = (e: ReplaceStateEvent) => {
      const argUrl = e.arguments[2] as string | URL | undefined;
      if (!argUrl) return;
      const url = new URL(argUrl, window.location.origin);
      const searchParam = (url.searchParams.get(paramName) as T) ?? undefined;
      if (searchParam !== state) {
        setState(searchParam);
      }
    };

    window.addEventListener('replaceState', replaceStateListener as EventListener);

    return () => {
      window.removeEventListener('replaceState', replaceStateListener as EventListener);
    };
  }, [paramName, state]);

  // Function to update both state and URL search parameter without adding to history.
  const updateState = (newValue: T | undefined) => {
    setState(newValue);

    // Update the URL search parameter with the new value without modifying history.
    const searchParams = new URLSearchParams(window.location.search);
    if (newValue) {
      searchParams.set(paramName, newValue);
    } else {
      searchParams.delete(paramName);
    }
    const newUrl = `${window.location.pathname}?${searchParams.toString()}`;

    // Replace the current URL without adding to the browser history.
    window.history.replaceState(
      { ...window.history.state, as: newUrl.toString(), url: newUrl.toString() },
      '',
      newUrl,
    );
  };

  return [state, updateState];
}
