'use client';

import { Process } from '@/lib/data/process-schema';
import { useState, useEffect } from 'react';
import ProcessList from '../../process-list';
import Button, { ButtonGroup } from '@atlaskit/button';
import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
} from '@atlaskit/modal-dialog';
import { getPNGFromSVG } from '@/lib/process-export/image-export';
import { getSVGFromBPMN } from '@/lib/process-export/util';
import { createAttachment } from '../../helpers';
import ProcessImportButton from '@/components/process-import';

const MacroEditor = ({ processes }: { processes: Process[] }) => {
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

  const saveMacro = async (process: Process) => {
    if (window.AP && window.AP.confluence) {
      await storeProcessAttachment(process);
      window.AP.confluence.saveMacro({ processId: process.id });
      window.AP.confluence.closeMacroEditor();
    }
  };

  return (
    <div>
      <ModalTransition>
        <Modal isBlanketHidden width="50vw" onClose={() => window.AP.confluence.closeMacroEditor()}>
          <ModalHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <ModalTitle>Embed Process</ModalTitle>
              <ProcessImportButton
                type="text"
                modalOkText="Import & Embed"
                style={{ padding: 0 }}
                onImport={(processes) => {
                  const process = processes[0];
                  saveMacro(process);
                }}
                allowMultipleImports={false}
              >
                <Button>Import Process</Button>
              </ProcessImportButton>
            </div>
          </ModalHeader>
          <ModalBody>
            <div style={{ padding: '1rem', width: '100%' }}>
              <ProcessList
                processes={processes}
                ActionButtons={({ process }: { process: Process }) => (
                  <ButtonGroup>
                    <Button appearance="primary" onClick={() => saveMacro(process)}>
                      Embed
                    </Button>
                  </ButtonGroup>
                )}
                includeContainer={false}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button onClick={() => window.AP.confluence.closeMacroEditor()}>Cancel</Button>
          </ModalFooter>
        </Modal>
      </ModalTransition>
    </div>
  );
};

export default MacroEditor;
