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

const ActionButtons = ({ process }: { process: Process }) => {
  const storeProcessAttachment = async (process: Process) => {
    console.log('store process attachment', process);
    const processSVG = await getSVGFromBPMN(process.bpmn);
    const processPNG = await getPNGFromSVG(processSVG);
    const bpmnBlob = new Blob([process.bpmn], { type: 'application/xml' });

    const formData = new FormData();
    formData.append('id', process.id);
    formData.append('bpmn', bpmnBlob);
    formData.append('image', processPNG);

    await createAttachment('14712843', formData);
  };

  const saveMacro = async () => {
    if (window.AP && window.AP.confluence) {
      await storeProcessAttachment(process);
      window.AP.confluence.saveMacro({ processId: process.id });
      window.AP.confluence.closeMacroEditor();
    }
  };
  return (
    <ButtonGroup>
      <Button appearance="primary" onClick={() => saveMacro()}>
        Embed
      </Button>
    </ButtonGroup>
  );
};

const MacroEditor = ({ processes }: { processes: Process[] }) => {
  return (
    <div>
      <ModalTransition>
        <Modal isBlanketHidden width="50vw" onClose={() => window.AP.confluence.closeMacroEditor()}>
          <ModalHeader>
            <ModalTitle>Embed Process</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div style={{ padding: '1rem', width: '100%' }}>
              <ProcessList
                processes={processes}
                ActionButtons={({ process }: { process: Process }) => (
                  <ActionButtons process={process} />
                )}
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
