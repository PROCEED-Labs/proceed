'use client';

import { Process } from '@/lib/data/process-schema';
import { useState, useEffect } from 'react';
import ProcessList from '../../process-list';
import Button, { ButtonGroup } from '@atlaskit/button';

const ActionButtons = ({ process }: { process: Process }) => {
  const [processId, setProcessId] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('window', window);
      if (window.AP && window.AP.confluence) {
        console.log('window AP', window.AP);
        window.AP.confluence.getMacroData((data: any) => {
          console.log('confluence macroData', data);
          if (data) {
            setProcessId(data.processId || data.parameters?.processId || '');
          }
        });
      }
    }
  }, []);

  const saveMacro = () => {
    if (window.AP && window.AP.confluence) {
      window.AP.confluence.saveMacro({ processId: process.id });
      window.AP.confluence.closeMacroEditor();
    }
    console.log('SAVE MACRO', processId);
    // window.AP.dialog.close({ processId });
  };
  return (
    <ButtonGroup>
      <Button onClick={() => saveMacro()}>Embedd</Button>
    </ButtonGroup>
  );
};

const EmbeddProcessList = ({ processes }: { processes: Process[] }) => {
  return (
    <ProcessList
      processes={processes}
      ActionButtons={({ process }: { process: Process }) => <ActionButtons process={process} />}
    />
  );
};

const MacroEditor = ({ processes }: { processes: Process[] }) => {
  return (
    <div style={{ padding: '1rem', width: '100%' }}>
      <EmbeddProcessList processes={processes}></EmbeddProcessList>
    </div>
  );
};

export default MacroEditor;
