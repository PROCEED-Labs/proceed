import { useUserPreferences } from '@/lib/user-preferences';
import style from './competences-viewer.module.scss';
import { Button, Card, Descriptions, DescriptionsProps, Input, List, Space } from 'antd';
import { FC, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ResizableBox } from 'react-resizable';

type CompetencesViewerProps = React.PropsWithChildren<{}>;

const CompetencesViewer: FC<CompetencesViewerProps> = ({ children }) => {
  const [containerHeight, setContainerHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!window) return;

    const handleResize = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [containerRef]);

  const addPreferences = useUserPreferences.use.addPreferences();
  const { upperCardHeight: height } = useUserPreferences.use['competences-viewer']();
  const preferencesHydrated = useUserPreferences.use._hydrated();

  const maxHeight = Math.round(containerHeight * 0.7),
    minHeight = Math.round(containerHeight * 0.3),
    intitalHeight = Math.round(containerHeight * 0.5);

  const setHeight = (newHeight: number) => {
    if (!preferencesHydrated) return;
    addPreferences({
      'competences-viewer': {
        upperCardHeight: Math.max(Math.min(newHeight, maxHeight), minHeight),
      },
    });
  };
  const oldContainerHeight = useRef(containerHeight);

  /* Handle updates of container height */
  useEffect(() => {
    /* Set new height */
    if (oldContainerHeight.current === 0) {
      oldContainerHeight.current = containerHeight;
      /* Check whther Preferences yield any value */
      if (preferencesHydrated && Number.isNaN(height)) setHeight(intitalHeight);
      return;
    }
    /* Other resize: */
    /* Get old height in % */
    const ratio = height / oldContainerHeight.current;
    /* Set old height to new height */
    oldContainerHeight.current = containerHeight;
    setHeight(Math.round(containerHeight * ratio));
  }, [containerHeight]);

  return (
    <>
      <div className={style.container} ref={containerRef}>
        <ResizableBox
          style={{ display: 'flex', gap: '1rem', flexDirection: 'column', width: '100%' }}
          // className={styles.resizable}
          height={height}
          axis="y"
          resizeHandles={['s']}
          minConstraints={[0, minHeight]}
          maxConstraints={[0, maxHeight]}
          onResizeStop={(_, { size }) => setHeight(size.height)}
          handle={
            <div className={style.outerHandle}>
              <div className={style.innerHandle} />
            </div>
          }
        >
          <Card className={style.card} title={'Description'} extra={'Plain Text'}>
            <Input.TextArea rows={6} />
          </Card>
        </ResizableBox>
        <Card className={style.card} title={'Atrributes'} extra={'Bullet Points'}>
          <List />
        </Card>
      </div>
    </>
  );
};

export default CompetencesViewer;
