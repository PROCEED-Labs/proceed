'use client';

import { Process } from '@/lib/data/process-schema';
import { useState, useEffect } from 'react';
import ProcessList from '../../process-list';
import Button, { ButtonGroup } from '@atlaskit/button';

const ActionButtons = ({ process }: { process: Process }) => {
  const [processId, setProcessId] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.AP && window.AP.confluence) {
      window.AP.confluence.getMacroData((data: any) => {
        if (data) {
          setProcessId(data.processId || data.parameters?.processId || '');
        }
      });
    }
  }, []);

  const saveMacro = () => {
    if (window.AP && window.AP.confluence) {
      window.AP.confluence.saveMacro({ processId: process.id });
      window.AP.confluence.closeMacroEditor();
    }
  };
  return (
    <ButtonGroup>
      <Button appearance="primary" onClick={() => saveMacro()}>
        Embed
      </Button>
    </ButtonGroup>
  );
};

const MacroEditor = ({ processes }: { processes: Process[] }) => {
  return (
    <div style={{ padding: '1rem', width: '100%' }}>
      <ProcessList
        processes={processes}
        ActionButtons={({ process }: { process: Process }) => <ActionButtons process={process} />}
      />
    </div>
  );
};

export default MacroEditor;
