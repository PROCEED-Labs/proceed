'use client';

import Button from '@atlaskit/button';
import { addProcesses, getProcessBPMN } from '@/lib/data/processes';
import { useEnvironment } from '@/components/auth-can';
import { useState, useEffect, CSSProperties } from 'react';

import { Process } from '@/lib/data/process-schema';
import Modeler from './confluence-modeler';
import ProcessModal from '../../process-modal';
import { getPNGFromSVG } from '@/lib/process-export/image-export';
import { getSVGFromBPMN } from '@/lib/process-export/util';
import { createAttachment } from '../../helpers';

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

    const confluencePageId = await getConfluencePageId();
    await createAttachment(confluencePageId, formData);
  };

  const getConfluencePageId = () => {
    return new Promise((resolve) => {
      window.AP.context.getContext((context) => {
        resolve(context.confluence.content.id);
      });
    }) as Promise<string>;
  };

  const updateProcess = async () => {
    if (process) {
      const bpmnResponse = await getProcessBPMN(process.id, spaceId);

      if (typeof bpmnResponse === 'object' && 'error' in bpmnResponse) {
        throw new Error('Could not retrieve BPMN of process');
      }

      const processWithBpmn = { ...process, bpmn: bpmnResponse };
      await storeProcessAttachment(processWithBpmn);

      window.AP.confluence.saveMacro({ processId: process.id });
      window.AP.confluence.closeMacroEditor();
    }
  };

  const createProcess = async (values: { name: string; description: string }) => {
    const res = await addProcesses([{ ...values, folderId: confluenceFolderId }], spaceId);

    if ('error' in res) {
      throw new Error('Something went wrong while adding process');
    } else {
      const process = res[0];
      await storeProcessAttachment(process);
      return process;
    }
  };

  const fullScreenStyle: CSSProperties = {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px',
    alignItems: 'center',
    borderBottom: '1px solid lightgrey',
  };

  return (
    <div>
      {process ? (
        <div style={fullScreenStyle}>
          <div style={headerStyle}>
            <span>{process.name}</span>
            <Button
              appearance="primary"
              onClick={() => {
                updateProcess().then(() => {
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
              const process = await createProcess(values);
              window.AP.confluence.saveMacro({ processId: process.id });
            }
            window.AP.confluence.closeMacroEditor();
          }}
        ></ProcessModal>
      )}
    </div>
  );
};

export default MacroEditor;
