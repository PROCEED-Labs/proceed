'use client';

import { addProcesses } from '@/lib/data/processes';
import { useEnvironment } from '@/components/auth-can';
import ProcessForm from '../../process-form';
import { useState, useEffect } from 'react';

import styles from './macro-editor.module.scss';
import { Process } from '@/lib/data/process-schema';
import Modeler from '@/app/(dashboard)/[environmentId]/processes/[processId]/modeler';

const MacroEditor = ({ processes }: { processes: Process[] }) => {
  const environment = useEnvironment();
  const { spaceId } = environment;
  const [process, setProcess] = useState<Process | undefined>(undefined);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.AP && window.AP.confluence) {
      window.AP.confluence.getMacroData((data: any) => {
        if (data && data.processId) {
          const process = processes.find((process) => process.id === data.processId);
          setProcess(process);
        } else {
          setProcess(undefined);
        }
      });
    }
  }, []);

  return process ? (
    <Modeler
      className={styles.Modeler}
      process={{ name: process.name, id: process.id, bpmn: process.bpmn }}
      versions={process.versions}
    />
  ) : (
    <div style={{ padding: '2px 24px' }}>
      <ProcessForm
        submit={(values) => {
          addProcesses([{ ...values }], spaceId).then((res) => {
            if ('error' in res) {
              console.log('something went wrong', res.error);
            } else {
              const process = res[0];
              if (window.AP && window.AP.confluence) {
                window.AP.confluence.saveMacro({ processId: process.id });
                window.AP.confluence.closeMacroEditor();
              }
            }
          });
        }}
        cancel={() => {
          if (window.AP && window.AP.confluence) {
            window.AP.confluence.closeMacroEditor();
          }
        }}
      ></ProcessForm>
    </div>
  );
};

export default MacroEditor;
