'use client';

import React, { useState } from 'react';

import { Upload } from 'antd';
import ProcessCreationModal, { ProcessData } from './process-creation';

import {
  getDefinitionsId,
  getDefinitionsName,
  getProcessDocumentation,
  toBpmnObject,
} from '@proceed/bpmn-helper';

// TODO: maybe show import errors and warnings like in the old MS (e.g. id collisions if an existing process is reimported or two imports use the same id)

const ProcessImportButton: React.FC = () => {
  const [importProcessData, setImportProcessData] = useState<ProcessData[]>([]);

  return (
    <>
      <Upload
        accept=".bpmn"
        multiple
        showUploadList={false}
        beforeUpload={(_, fileList) => {
          Promise.all(
            fileList.map(async (file) => {
              // get the bpmn from the file and then extract relevant process meta data from the bpmn
              const bpmn = await file.text();

              const bpmnObj = await toBpmnObject(bpmn);

              return {
                definitionId: (await getDefinitionsId(bpmnObj)) || '',
                definitionName: (await getDefinitionsName(bpmnObj)) || '',
                description: await getProcessDocumentation(bpmn),
                bpmn,
              };
            }),
          ).then((processesData) => setImportProcessData(processesData));
          return false;
        }}
      >
        <span>Import Process</span>
      </Upload>
      <ProcessCreationModal
        processesData={importProcessData}
        creationType="Import"
        title={`Import Process${importProcessData.length > 1 ? 'es' : ''}`}
        onCancel={() => setImportProcessData([])}
      />
    </>
  );
};

export default ProcessImportButton;
