'use client';

import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button';
import { addProcesses, getProcessBPMN } from '@/lib/data/processes';
import { useEnvironment } from '@/components/auth-can';
import { useState, useEffect, CSSProperties } from 'react';

import { Process } from '@/lib/data/process-schema';
import Modeler from './confluence-modeler';
import ProcessModal from '../../process-modal';
import { updateProcessGuestAccessRights } from '@/lib/sharing/process-sharing';
import { getPNGFromSVG } from '@/lib/process-export/image-export';
import { getSVGFromBPMN } from '@/lib/process-export/util';
import { createAttachment, getAttachmentProcessBase64Image } from '../../helpers';

const MacroEditor = ({
  processes,
  confluenceFolderId,
}: {
  processes: Process[];
  confluenceFolderId: string;
}) => {
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

  const storeProcessAttachment = async (process: Process) => {
    const processSVG = await getSVGFromBPMN(process.bpmn);
    const processPNG = await getPNGFromSVG(processSVG);
    const bpmnBlob = new Blob([process.bpmn], { type: 'application/xml' });

    const formData = new FormData();
    formData.append('id', process.id);
    formData.append('bpmn', bpmnBlob);
    formData.append('image', processPNG);

    return createAttachment('14712843', formData);
  };

  return (
    <div>
      {process ? (
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
                getProcessBPMN(process.id, spaceId)
                  .then((bpmnResponse) => {
                    if (typeof bpmnResponse === 'string') {
                      return { ...process, bpmn: bpmnResponse };
                    } else {
                      return process;
                    }
                  })
                  .then((updatedProcess) => {
                    return storeProcessAttachment(updatedProcess);
                  })
                  .then(() => {
                    window.AP.confluence.saveMacro({ processId: process.id });
                    window.AP.confluence.closeMacroEditor();
                  });
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
          close={async (values) => {
            if (values) {
              const res = await addProcesses(
                [{ ...values, folderId: confluenceFolderId }],
                spaceId,
              );

              if ('error' in res) {
                throw new Error('Something went wrong while adding process');
              } else {
                const process = res[0];
                await storeProcessAttachment(process);

                if (window.AP && window.AP.confluence) {
                  window.AP.confluence.saveMacro({ processId: process.id });
                }
              }
            }

            if (window.AP && window.AP.confluence) {
              window.AP.confluence.closeMacroEditor();
            }
          }}
        ></ProcessModal>
      )}
    </div>
  );
};

export default MacroEditor;
