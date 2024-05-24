'use client';

import { addProcesses, getProcess } from '@/lib/data/processes';
import { useEnvironment } from '@/components/auth-can';
import ProcessForm from '../../process-form';
import { useState, useEffect } from 'react';

import styles from './macro-editor.module.scss';
import { Process } from '@/lib/data/process-schema';
import Modeler from '@/app/(dashboard)/[environmentId]/processes/[processId]/modeler';

const MacroEditor = ({ processes }: { processes: Process[] }) => {
  const { spaceId } = useEnvironment();
  const [process, setProcess] = useState<Process | undefined>(undefined);

  useEffect(() => {
    if (window && window.AP && window.AP.confluence) {
      window.AP.confluence.getMacroData((data: any) => {
        console.log('macro data', data);
        if (data && data.processId) {
          const process = processes.find((process) => process.id === data.processId);
          setProcess(process);
        } else {
          setProcess(undefined);
        }
      });
    }
    // else {
    //   const mockProcessId = '_f9fd6cf7-20dc-459e-9bc9-e9f2c4c74a9a';
    //   const process = processes.find((process) => process.id === mockProcessId);
    //   console.log('process', process);
    //   setProcess(process);
    // }
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
        }}
        cancel={() => {
          if (window.AP && window.AP.confluence) {
            window.AP.confluence.closeMacroEditor();
          }
          console.log('CLOSE MACRO');
        }}
      ></ProcessForm>
    </div>
  );
};

export default MacroEditor;
