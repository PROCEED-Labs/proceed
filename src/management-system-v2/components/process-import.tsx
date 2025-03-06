'use client';

import React, { useState } from 'react';

import { Button, Upload } from 'antd';
import type { ButtonProps } from 'antd';

import { getDefinitionsName, getProcessDocumentation, toBpmnObject } from '@proceed/bpmn-helper';
import ProcessModal from './process-modal';
import { importProcesses } from '@/lib/data/processes';
import { useRouter } from 'next/navigation';
import { useEnvironment } from './auth-can';
import JSZip from 'jszip';

export type ProcessData = {
  name: string;
  description: string;
  bpmn: string;
  artefacts?: {
    images?: Array<{ name: string; content: string }>;
    userTasks?: Array<{ name: string; content: string }>;
    scriptTasks?: Array<{ name: string; content: string }>;
  };
};

// TODO: maybe show import errors and warnings like in the old MS (e.g. id collisions if an existing process is reimported or two imports use the same id)

const ProcessImportButton: React.FC<ButtonProps> = ({ ...props }) => {
  const [importProcessData, setImportProcessData] = useState<ProcessData[]>([]);
  const router = useRouter();
  const environment = useEnvironment();

  return (
    <>
      <Upload
        accept=".bpmn, .zip"
        multiple
        showUploadList={false}
        beforeUpload={async (_, fileList) => {
          const processesData: ProcessData[] = [];
          await Promise.all(
            fileList.map(async (file) => {
              if (file.type === 'application/zip') {
                const zip = await JSZip.loadAsync(file);
                const bpmnFiles = Object.keys(zip.files).filter((name) =>
                  name.toLowerCase().endsWith('.bpmn'),
                );

                await Promise.all(
                  bpmnFiles.map(async (bpmnFilePath) => {
                    const bpmnFile = zip.files[bpmnFilePath];
                    const bpmn = await bpmnFile.async('text');
                    const bpmnObj = await toBpmnObject(bpmn);

                    const processData: ProcessData = {
                      name: (await getDefinitionsName(bpmnObj)) || '',
                      description: await getProcessDocumentation(bpmn),
                      bpmn,
                      artefacts: {
                        images: [],
                        userTasks: [],
                        scriptTasks: [],
                      },
                    };

                    // Handle artefacts in the same directory as the BPMN file
                    const artefactPath = bpmnFilePath.split('/').slice(0, -1).join('/');
                    const artefactFiles = Object.keys(zip.files).filter(
                      (name) =>
                        name.startsWith(artefactPath.concat('/')) &&
                        name !== bpmnFilePath &&
                        !zip.files[name].dir,
                    );

                    await Promise.all(
                      artefactFiles.map(async (fileName) => {
                        const file = zip.files[fileName];
                        const name = fileName.split('/').pop()!;
                        if (
                          ['.png', '.jpg', '.jpeg', '.gif', '.webp'].some((ext) =>
                            name.endsWith(ext),
                          )
                        ) {
                          const content = await file.async('base64');
                          processData.artefacts!.images!.push({ name, content });
                        } else if (['.js', '.ts'].some((ext) => name.endsWith(ext))) {
                          const content = await file.async('text');
                          processData.artefacts!.scriptTasks!.push({ name, content });
                        } else if (['.json', '.html'].some((ext) => name.endsWith(ext))) {
                          const textContent = await file.async('text');
                          processData.artefacts!.userTasks!.push({ name, content: textContent });
                        }
                      }),
                    );

                    processesData.push(processData);
                  }),
                );
              } else {
                const bpmn = await file.text();
                const bpmnObj = await toBpmnObject(bpmn);
                processesData.push({
                  name: (await getDefinitionsName(bpmnObj)) || '',
                  description: await getProcessDocumentation(bpmn),
                  bpmn,
                });
              }
            }),
          );
          setImportProcessData(processesData);
          return false;
        }}
      >
        <Button {...props}></Button>
      </Upload>
      <ProcessModal
        open={importProcessData.length > 0}
        title={`Import Process${importProcessData.length > 1 ? 'es' : ''}`}
        okText="Import"
        onCancel={() => setImportProcessData([])}
        onSubmit={async (processesData) => {
          const res = await importProcesses(processesData, environment.spaceId);
          if ('error' in res!) {
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
