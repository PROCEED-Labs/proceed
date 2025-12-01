'use client';

import { Suspense, useState, useRef, useEffect } from 'react';
import { Card, Button, Space } from 'antd';
import { StarOutlined } from '@ant-design/icons';
import { LazyBPMNViewer } from '@/components/bpmn-viewer';
import { useRouter } from 'next/navigation';
import { spaceURL } from '@/lib/utils';
import { useEnvironment } from '@/components/auth-can';
import { OverflowTooltipTitle } from '@/components/overflow-tooltip';
import ProceedLoadingIndicator from '@/components/loading-proceed';

type FavoriteProcess = {
  id: string;
  name: string;
  lastEditedOn: Date;
};

type SortType = 'lastEdited' | 'alphabetical';

type FavoriteProcessesSectionProps = {
  processes: FavoriteProcess[];
};

const ProcessCard = ({
  process,
  space,
  router,
}: {
  process: FavoriteProcess;
  space: any;
  router: any;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const loader = (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        width: '100%',
      }}
    >
      <div style={{ transform: 'scale(0.8)' }}>
        <ProceedLoadingIndicator />
      </div>
    </div>
  );

  return (
    <div ref={cardRef}>
      <Card
        hoverable
        style={{
          height: '191px',
          width: '225px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
        styles={{
          body: { padding: '12px', flex: 1, overflow: 'hidden' },
          header: { padding: '0 10px', minHeight: '38px', fontSize: '14px' },
        }}
        title={
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              width: '100%',
              fontSize: '0.9em',
            }}
          >
            <OverflowTooltipTitle>{process.name}</OverflowTooltipTitle>
          </div>
        }
        onDoubleClick={() => {
          const url = `/processes/editor/${process.id}`;
          router.push(spaceURL(space, url));
        }}
      >
        {isVisible ? (
          <Suspense fallback={loader}>
            <LazyBPMNViewer
              definitionId={process.id}
              reduceLogo={true}
              fitOnResize={true}
              fallback={loader}
            />
          </Suspense>
        ) : (
          loader
        )}
      </Card>
    </div>
  );
};

const FavoriteProcessesSection = ({ processes }: FavoriteProcessesSectionProps) => {
  const router = useRouter();
  const space = useEnvironment();
  const [sortType, setSortType] = useState<SortType>('lastEdited');

  // Sort processes based on selected sort type
  const getSortedProcesses = () => {
    const sorted = [...processes];
    if (sortType === 'lastEdited') {
      sorted.sort(
        (a, b) => new Date(b.lastEditedOn).getTime() - new Date(a.lastEditedOn).getTime(),
      );
    } else if (sortType === 'alphabetical') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted;
  };

  const displayedProcesses = getSortedProcesses();

  if (displayedProcesses.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        marginBottom: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div style={{ maxWidth: '1430px', width: 'fit-content' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <h2 style={{ margin: 0 }}>
            <StarOutlined style={{ marginRight: '8px' }} />
            Favorite Processes
          </h2>
          <Space size="small">
            <Button
              type={sortType === 'lastEdited' ? 'primary' : 'default'}
              onClick={() => setSortType('lastEdited')}
              size="small"
            >
              Last Edited
            </Button>
            <Button
              type={sortType === 'alphabetical' ? 'primary' : 'default'}
              onClick={() => setSortType('alphabetical')}
              size="small"
            >
              Alphabetical
            </Button>
          </Space>
        </div>
        <div
          style={{
            display: 'flex',
            gap: '16px',
            overflowX: 'auto',
            paddingBottom: '8px',
          }}
        >
          {displayedProcesses.map((process) => (
            <ProcessCard key={process.id} process={process} space={space} router={router} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default FavoriteProcessesSection;
