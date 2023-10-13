import { useState, useEffect } from 'react';

const useStore = <T, F>(
  store: (callback: (state: T) => unknown) => unknown,
  callback: (state: T) => F,
) => {
  const result = store(callback) as F;
  const [data, setData] = useState<F>();

  useEffect(() => {
    setData(result);
  }, [result]);

  return (
    data ?? {
      preferences: {
        /* Default User-Settings: */
        'show-process-meta-data': true,
        'icon-view-in-process-list': false,
      },
      addPreferences: () => {},
    }
  );
};

export default useStore;
