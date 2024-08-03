'use client';
import { CSSProperties, useEffect } from 'react';
import Modeler from '../../macro-editor/create/confluence-modeler';
import { Process } from '@/lib/data/process-schema';
import { useRouter } from 'next/navigation';
import Link from '@atlaskit/link';

const baseUrl = process.env.NEXTAUTH_URL ?? '';

const Macro = ({ process }: { process: Process }) => {
  const proceedURL = `${baseUrl}/${process.environmentId}/processes/${process.id}`;
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

  const wrapperStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '400px',
    border: '1px solid #f0f0f0',
    borderRadius: '0.5rem',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.75rem',
    borderBottom: '1px solid #f0f0f0',
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  };

  const footerStyle: CSSProperties = {
    padding: '0.75rem',
    borderTop: '1px solid #f0f0f0',
    backgroundColor: '#f0f0f0',
  };

  return (
    <>
      <div style={wrapperStyle}>
        <div style={headerStyle}>
          <div>
            <img style={{ width: '3rem', marginRight: '0.75rem' }} src="/proceed-icon.png"></img>
            <span style={{ fontWeight: 'bold' }}>{process.name}</span>
          </div>
          <Link href={proceedURL} rel="noopener noreferrer" target="_blank">
            View in PROCEED
          </Link>
        </div>
        <div style={{ flexGrow: 1, position: 'relative' }}>
          <Modeler isViewer process={{ name: process.name, id: process.id, bpmn: process.bpmn }} />
        </div>
        <div style={footerStyle}>
          <span style={{ fontWeight: 'bold' }}>Description:&nbsp;</span>
          <span> {process.description}</span>
        </div>
      </div>
    </>
  );
};

export default Macro;
