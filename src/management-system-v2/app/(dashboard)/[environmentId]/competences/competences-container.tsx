'use client';
import style from './competences-container.module.scss';
import { Space } from 'antd';
import { FC, useLayoutEffect, useRef, useState } from 'react';
import CompetencesTable from './competences-table';
import CompetencesViewer from './competences-viewer';
import { Competence } from '@/lib/data/competence-schema';

type CompentencesContainerProps = React.PropsWithChildren<{
  competences: Competence[];
}>;

const CompentencesContainer: FC<CompentencesContainerProps> = ({ children }) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  // console.log(containerWidth);

  useLayoutEffect(() => {
    if (!window) return;

    const handleResize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [containerRef]);

  return (
    <>
      <div className={style.container} ref={containerRef}>
        <CompetencesTable containerWidth={containerWidth} />
        <CompetencesViewer />
      </div>
    </>
  );
};

export default CompentencesContainer;
