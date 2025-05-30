'use client';
import style from './competences-container.module.scss';
import { Space } from 'antd';
import { FC, useLayoutEffect, useRef, useState } from 'react';
import CompetencesTable from './competences-table';
import CompetencesViewer from './competences-viewer';
import { SpaceCompetence } from '@/lib/data/competence-schema';

type CompentencesContainerProps = React.PropsWithChildren<{
  competences: SpaceCompetence[];
  environmentId: string;
}>;

const CompentencesContainer: FC<CompentencesContainerProps> = ({
  children,
  competences,
  environmentId,
}) => {
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

  const [selectedCompetence, setSelectedCompetence] = useState<SpaceCompetence | null>(null);

  return (
    <>
      <div className={style.container} ref={containerRef}>
        <CompetencesTable
          containerWidth={containerWidth}
          competences={competences}
          selectedCompetence={selectedCompetence}
          setSelectedSpaceCompetence={setSelectedCompetence}
          environmentId={environmentId}
        />
        <CompetencesViewer environmentId={environmentId} selectedCompetence={selectedCompetence} />
      </div>
    </>
  );
};

export default CompentencesContainer;
