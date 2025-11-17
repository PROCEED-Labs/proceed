'use client';

import { Suspense, useRef } from 'react';
import { Card } from 'antd';
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
};

type FavoriteProcessesSectionProps = {
  processes: FavoriteProcess[];
};

const FavoriteProcessesSection = ({ processes }: FavoriteProcessesSectionProps) => {
  const router = useRouter();
  const space = useEnvironment();

  // Show only up to 10 processes
  const displayedProcesses = processes.slice(0, 10);

  if (displayedProcesses.length === 0) {
    return null;
  }

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h2>
        <StarOutlined style={{ marginRight: '8px' }} />
        Favorite Processes
      </h2>
      <div
        style={{
          display: 'flex',
          gap: '16px',
          overflowX: 'auto',
          paddingBottom: '8px',
        }}
      >
        {displayedProcesses.map((process) => (
          <Card
            key={process.id}
            hoverable
            style={{ height: '255px', flexShrink: 0 }}
            title={
              <div style={{ display: 'inline-flex', alignItems: 'center', width: '100%' }}>
                <OverflowTooltipTitle>{process.name}</OverflowTooltipTitle>
              </div>
            }
            onDoubleClick={() => {
              const url = `/processes/editor/${process.id}`;
              router.push(spaceURL(space, url));
            }}
          >
            <Suspense fallback={<ProceedLoadingIndicator scale="100%" />}>
              <LazyBPMNViewer definitionId={process.id} reduceLogo={true} />
            </Suspense>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default FavoriteProcessesSection;
