'use client';
import { useEffect } from 'react';
import Modeler from '../../macro-editor/create/confluence-modeler';
import { Process } from '@/lib/data/process-schema';
import { useRouter } from 'next/navigation';
import Link from '@atlaskit/link';

const Macro = ({ process }: { process: Process }) => {
  const router = useRouter();
  useEffect(() => {
    if (typeof window !== 'undefined' && window.AP && window.AP.confluence) {
      window.AP.confluence.getMacroData((data: any) => {
        if (data && data.processId) {
          router.refresh();
        }
      });
    }
  }, []);

  return (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '400px',
          border: '1px solid #f0f0f0',
          borderRadius: '0.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '0.75rem',
            borderBottom: '1px solid #f0f0f0',
            backgroundColor: '#f0f0f0',
            alignItems: 'center',
          }}
        >
          <div>
            <img style={{ width: '3rem', marginRight: '0.75rem' }} src="/proceed-icon.png"></img>
            <span style={{ fontWeight: 'bold' }}>{process.name}</span>
          </div>
          <Link
            href={`${process.environmentId}/processes/${process.id}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            View in PROCEED
          </Link>
        </div>
        <div style={{ flexGrow: 1, position: 'relative' }}>
          <Modeler isViewer process={{ name: process.name, id: process.id, bpmn: process.bpmn }} />
        </div>
        <div
          style={{ padding: '0.75rem', borderTop: '1px solid #f0f0f0', backgroundColor: '#f0f0f0' }}
        >
          <span style={{ fontWeight: 'bold' }}>Description:</span>{' '}
          <span> {process.description}</span>
        </div>
      </div>
    </>
  );
};

export default Macro;
