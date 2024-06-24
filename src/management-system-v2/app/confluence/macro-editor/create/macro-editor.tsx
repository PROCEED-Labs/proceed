'use client';

import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button';
import { addProcesses } from '@/lib/data/processes';
import { useEnvironment } from '@/components/auth-can';
import { useState, useEffect, CSSProperties } from 'react';

import { Process } from '@/lib/data/process-schema';
import Modeler from './confluence-modeler';
import ProcessModal from '../../process-modal';
import { updateProcessGuestAccessRights } from '@/lib/sharing/process-sharing';

const MacroEditor = ({ processes }: { processes: Process[] }) => {
  const { spaceId } = useEnvironment();
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

  return (
    <div>
      {process ? (
        // <Modal
        //   isBlanketHidden
        //   width="100vw"
        //   height="100vh"
        //   onClose={() => window.AP.confluence.closeMacroEditor()}
        // >
        //   <ModalHeader>
        //     <ModalTitle>Process Editor</ModalTitle>
        //   </ModalHeader>
        //   <ModalBody>
        //     <Modeler
        //       style={{ width: '100%', height: '100%' }}
        //       process={{ name: process.name, id: process.id, bpmn: process.bpmn }}
        //       versions={process.versions}
        //     />
        //   </ModalBody>
        //   <ModalFooter>
        //     <Button appearance="primary" onClick={() => window.AP.confluence.closeMacroEditor()}>
        //       Close
        //     </Button>
        //   </ModalFooter>
        // </Modal>
        <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '10px',
              alignItems: 'center',
              borderBottom: '1px solid lightgrey',
            }}
          >
            <span>{process.name}</span>
            <Button
              appearance="primary"
              onClick={() => {
                window.AP.confluence.saveMacro({ processId: process.id });
                window.AP.confluence.closeMacroEditor();
              }}
            >
              Close
            </Button>
          </div>
          <Modeler
            style={{ flexGrow: 1 }}
            process={{ name: process.name, id: process.id, bpmn: process.bpmn }}
          />
        </div>
      ) : (
        <ProcessModal
          title="Create Process"
          open={true}
          close={(values) => {
            if (values) {
              addProcesses([{ ...values }], spaceId).then((res) => {
                if ('error' in res) {
                  console.log('something went wrong', res.error);
                } else {
                  const process = res[0];

                  const timestamp = Date.now();
                  updateProcessGuestAccessRights(
                    process.id,
                    {
                      sharedAs: 'public',
                      shareTimestamp: 100,
                    },
                    spaceId,
                  ).then((res) => {
                    if (window.AP && window.AP.confluence) {
                      window.AP.confluence.saveMacro({ processId: process.id });
                      window.AP.confluence.closeMacroEditor();
                    }
                  });
                }
              });
            } else {
              if (window.AP && window.AP.confluence) {
                window.AP.confluence.closeMacroEditor();
              }
            }
          }}
        ></ProcessModal>
      )}
    </div>
  );
};

export default MacroEditor;
