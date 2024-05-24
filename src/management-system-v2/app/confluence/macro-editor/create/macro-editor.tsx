'use client';

import { useState, useEffect } from 'react';
import ProcessModal from '../../process-modal';
import { addProcesses } from '@/lib/data/processes';
import { useEnvironment } from '@/components/auth-can';
import { useRouter } from 'next/navigation';
import ProcessForm from '../../process-form';

const MacroEditor = () => {
  const { spaceId } = useEnvironment();
  const router = useRouter();
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
      window.AP.confluence.saveMacro({ processId });
      window.AP.confluence.closeMacroEditor();
    }
    console.log('SAVE MACRO', processId);
    // window.AP.dialog.close({ processId });
  };

  return (
    <ProcessForm
      submit={(values) => {
        if (values) {
          addProcesses([{ ...values }], spaceId).then((res) => {
            console.log('added process', res);
            if ('error' in res) {
              console.log('something went wrong', res.error);
            } else {
              const process = res[0];
              console.log('try to close editor and save', process);
              if (window.AP && window.AP.confluence) {
                window.AP.confluence.saveMacro({ processId: process.id });
                window.AP.confluence.closeMacroEditor();
              }
            }
          });
        }
        console.log('close');
      }}
      cancel={() => {
        console.log('OK');
      }}
    ></ProcessForm>
  );
};

export default MacroEditor;
