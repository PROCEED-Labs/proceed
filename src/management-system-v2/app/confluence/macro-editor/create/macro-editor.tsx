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

  const storeProcessAttachment = async (process: Process) => {
    console.log('store process attachment', process);
    const processSVG = await getSVGFromBPMN(process.bpmn);
    const processPNG = await getPNGFromSVG(processSVG);
    const bpmnBlob = new Blob([process.bpmn], { type: 'application/xml' });

    console.log('processSVG', processSVG);
    console.log('processPNG', processPNG);
    console.log('bpmnBlob', bpmnBlob);
    const formData = new FormData();
    formData.append('id', process.id);
    formData.append('bpmn', bpmnBlob);
    formData.append('image', processPNG);
    console.log('formData', formData);

    await createAttachment('14712843', formData);
    console.log('after creating attachment');
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
          close={(values) => {
            if (values) {
              addProcesses([{ ...values }], spaceId).then((res) => {
                if ('error' in res) {
                  console.log('something went wrong', res.error);
                } else {
                  const process = res[0];
                  console.log('process', process);
                  storeProcessAttachment(process);
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
