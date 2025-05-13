'use client';
import { useUserPreferences } from '@/lib/user-preferences';
import styles from './competences-table.module.scss';
import { Card, Space, Table } from 'antd';
import { FC, useState, useRef, ReactNode, useEffect } from 'react';
import { ResizableBox } from 'react-resizable';

type CompetencesTableProps = React.PropsWithChildren<{
  containerWidth: number;
}>;

const CompetencesTable: FC<CompetencesTableProps> = ({ children, containerWidth }) => {
  const addPreferences = useUserPreferences.use.addPreferences();
  const { cardWidth: width } = useUserPreferences.use['competences-table']();
  const preferencesHydrated = useUserPreferences.use._hydrated();

  const maxWidth = Math.round(containerWidth * 0.7),
    minWidth = Math.round(containerWidth * 0.3),
    intitalWidth = Math.round(containerWidth * 0.5);

  const setWidth = (newWidth: number) => {
    if (!preferencesHydrated) return;
    addPreferences({
      'competences-table': { cardWidth: Math.max(Math.min(newWidth, maxWidth), minWidth) },
    });
  };
  const oldContainerWidth = useRef(containerWidth);

  /* Handle updates of container width */
  useEffect(() => {
    /* Set new width */
    /* Edge-Case: Initial render (parent has not figuered out the actual width in px, yet) */
    if (oldContainerWidth.current === 0) {
      oldContainerWidth.current = containerWidth;
      /* Check whther Preferences yield any value */
      if (preferencesHydrated && Number.isNaN(width)) setWidth(intitalWidth);
      return;
    }
    /* Other resize: */
    /* Get old width in % */
    const ratio = width / oldContainerWidth.current;
    /* Set old width to new width */
    oldContainerWidth.current = containerWidth;
    setWidth(Math.round(containerWidth * ratio));
  }, [containerWidth]);

  return (
    <>
      <ResizableBox
        style={{ display: 'flex', gap: '1rem' }}
        className={styles.resizable}
        width={width}
        // height={0}
        axis="x"
        resizeHandles={['e']}
        minConstraints={[minWidth, 0]}
        maxConstraints={[maxWidth, 0]}
        onResizeStop={(_, { size }) => setWidth(size.width)}
        handle={
          <div className={styles.outerHandle}>
            <div className={styles.innerHandle} />
          </div>
        }
      >
        <Card className={styles.card} title={'Exisiting Competences'}>
          <Table className={styles.table} />
        </Card>
      </ResizableBox>
    </>
  );
};

export default CompetencesTable;
