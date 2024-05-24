'use client';

import { addProcesses } from '@/lib/data/processes';
import { useEnvironment } from '@/components/auth-can';
import ProcessForm from '../../process-form';

const MacroEditor = () => {
  const { spaceId } = useEnvironment();

  return (
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
