'use client';

import React, { useState } from 'react';

import { Button, Upload } from 'antd';
import type { ButtonProps } from 'antd';

import {
  getDefinitionsId,
  getDefinitionsName,
  getProcessDocumentation,
  toBpmnObject,
} from '@proceed/bpmn-helper';
import ProcessModal from './process-modal';
import { addProcesses } from '@/lib/data/processes';
import { useRouter } from 'next/navigation';
import { useEnvironment } from './auth-can';

export type ProcessData = {
  name: string;
  description: string;
  bpmn: string;
};

// TODO: maybe show import errors and warnings like in the old MS (e.g. id collisions if an existing process is reimported or two imports use the same id)

const ProcessImportButton: React.FC<ButtonProps> = ({ ...props }) => {
  const [importProcessData, setImportProcessData] = useState<ProcessData[]>([]);
  const router = useRouter();
  const environment = useEnvironment();

  return (
    <>
      <Upload
        accept=".bpmn"
        multiple
        showUploadList={false}
        beforeUpload={async (_, fileList) => {
          const processesData = await Promise.all(
            fileList.map(async (file) => {
              // get the bpmn from the file and then extract relevant process meta data from the bpmn
              const bpmn = await file.text();

              const bpmnObj = await toBpmnObject(bpmn);

              return {
                name: (await getDefinitionsName(bpmnObj)) || '',
                description: await getProcessDocumentation(bpmn),
                bpmn,
              };
            }),
          );
          setImportProcessData(processesData);
          return false;
        }}
      >
        {/* <span>Import Process</span> */}
        <Button {...props}></Button>
      </Upload>
      <ProcessModal
        open={importProcessData.length > 0}
        title={`Import Process${importProcessData.length > 1 ? 'es' : ''}`}
        okText="Import"
        onCancel={() => setImportProcessData([])}
        onSubmit={async (processesData) => {
          const res = await addProcesses(processesData, environment.spaceId);
          // Let modal handle errors
          if ('error' in res) {
            return res;
          }
          setImportProcessData([]);
          router.refresh();
        }}
        initialData={importProcessData}
      />
    </>
  );
};

export default ProcessImportButton;
