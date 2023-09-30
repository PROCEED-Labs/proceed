import { useEffect, useRef, useState } from 'react';

export default function useDebounce<TData>(value: TData, milliSeconds: number, enabled?: boolean) {
  const [debouncedValue, setDebouncedValue] = useState<TData>(value);
  const currentTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (enabled) {
      if (currentTimeout.current) clearTimeout(currentTimeout.current);

      currentTimeout.current = setTimeout(() => {
        setDebouncedValue(value);
      }, milliSeconds);

      return () => {
        if (currentTimeout.current) clearTimeout(currentTimeout.current);
      };
    }
  }, [value, milliSeconds, enabled]);

  return debouncedValue;
}
