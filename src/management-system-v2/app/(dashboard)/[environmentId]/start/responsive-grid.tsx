'use client';

import { ReactNode, useEffect, useState } from 'react';
import styles from './page.module.scss';
import { Grid } from 'antd';

type ResponsiveGridProps = {
  children: ReactNode;
};

const ResponsiveGrid = ({ children }: ResponsiveGridProps) => {
  const breakpoint = Grid.useBreakpoint();

  return (
    <div
      className={styles.gridContainer}
      style={{
        gridTemplateColumns: !breakpoint.lg ? '1fr' : '1fr 1fr',
      }}
    >
      {children}
    </div>
  );
};

export default ResponsiveGrid;
