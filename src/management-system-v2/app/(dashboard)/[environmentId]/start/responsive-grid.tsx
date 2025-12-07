'use client';

import { ReactNode, useEffect, useState } from 'react';
import styles from './page.module.scss';

type ResponsiveGridProps = {
  children: ReactNode;
};

const ResponsiveGrid = ({ children }: ResponsiveGridProps) => {
  const [isSingleColumn, setIsSingleColumn] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1035px)');
    setIsSingleColumn(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsSingleColumn(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return (
    <div
      className={styles.gridContainer}
      style={{
        gridTemplateColumns: isSingleColumn ? '1fr' : '1fr 1fr',
      }}
    >
      {children}
    </div>
  );
};

export default ResponsiveGrid;
