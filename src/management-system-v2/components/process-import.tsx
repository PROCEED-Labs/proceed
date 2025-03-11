'use client';

import React, { useState } from 'react';

import { Button, Modal, Upload, message } from 'antd';
import type { ButtonProps } from 'antd';

import {
  getDefinitionsName,
  getElementsByTagName,
  getProcessDocumentation,
  toBpmnObject,
} from '@proceed/bpmn-helper';
import ProcessModal from './process-modal';
import { importProcesses } from '@/lib/data/processes';
import { useRouter } from 'next/navigation';
import { useEnvironment } from './auth-can';
import JSZip from 'jszip';

export type ProcessData = {
  name: string;
  description: string;
  creator?: string;
  createdOn?: string;
  userDefinedId?: string;
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
          try {
            const processesData: ProcessData[] = [];
            const errors: { fileName: string; error: string }[] = [];

            await Promise.all(
              fileList.map(async (file) => {
                try {
                  if (file.type === 'application/zip') {
                    try {
                      const zip = await JSZip.loadAsync(file);
                      const bpmnFiles = Object.keys(zip.files).filter((name) =>
                        name.toLowerCase().endsWith('.bpmn'),
                      );

                      if (bpmnFiles.length === 0) {
                        errors.push({
                          fileName: file.name,
                          error: 'No BPMN files found in ZIP archive',
                        });
                        return;
                      }

                      await Promise.all(
                        bpmnFiles.map(async (bpmnFilePath) => {
                          try {
                            const bpmnFile = zip.files[bpmnFilePath];
                            const bpmn = await bpmnFile.async('text');

                            try {
                              const bpmnObj = await toBpmnObject(bpmn);
                              const [definitions] = await getElementsByTagName(
                                bpmnObj,
                                'bpmn:Definitions',
                              );

                              if (!definitions) {
                                errors.push({
                                  fileName: bpmnFilePath,
                                  error: 'Invalid BPMN file: missing Definitions element',
                                });
                                return;
                              }

                              const processData: ProcessData = {
                                name: (await getDefinitionsName(bpmnObj)) || '',
                                description: await getProcessDocumentation(bpmn),
                                userDefinedId: definitions['userDefinedId'],
                                creator: definitions['creatorUsername'],
                                createdOn: definitions['creationDate'],
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
                                  try {
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
                                    } else if (
                                      ['.json', '.html'].some((ext) => name.endsWith(ext))
                                    ) {
                                      const textContent = await file.async('text');
                                      processData.artefacts!.userTasks!.push({
                                        name,
                                        content: textContent,
                                      });
                                    }
                                  } catch (e: any) {
                                    errors.push({
                                      fileName: fileName,
                                      error: `Failed to process artifact: ${e.message || 'Unknown error'}`,
                                    });
                                  }
                                }),
                              );

                              processesData.push(processData);
                            } catch (e: any) {
                              errors.push({
                                fileName: bpmnFilePath,
                                error: `Failed to parse BPMN: ${e.message || 'Invalid BPMN format'}`,
                              });
                            }
                          } catch (e: any) {
                            errors.push({
                              fileName: bpmnFilePath,
                              error: `Failed to read file from ZIP: ${e.message || 'Unknown error'}`,
                            });
                          }
                        }),
                      );
                    } catch (e: any) {
                      errors.push({
                        fileName: file.name,
                        error: `Failed to extract ZIP: ${e.message || 'Invalid ZIP format'}`,
                      });
                    }
                  } else {
                    try {
                      const bpmn = await file.text();

                      try {
                        const bpmnObj = await toBpmnObject(bpmn);
                        const [definitions] = await getElementsByTagName(
                          bpmnObj,
                          'bpmn:Definitions',
                        );

                        if (!definitions) {
                          errors.push({
                            fileName: file.name,
                            error: 'Invalid BPMN file: missing Definitions element',
                          });
                          return;
                        }

                        processesData.push({
                          name: (await getDefinitionsName(bpmnObj)) || '',
                          description: await getProcessDocumentation(bpmn),
                          bpmn,
                        });
                      } catch (e: any) {
                        errors.push({
                          fileName: file.name,
                          error: `Failed to parse BPMN: ${e.message || 'Invalid BPMN format'}`,
                        });
                      }
                    } catch (e: any) {
                      errors.push({
                        fileName: file.name,
                        error: `Failed to read file: ${e.message || 'Unknown error'}`,
                      });
                    }
                  }
                } catch (e: any) {
                  errors.push({
                    fileName: file.name,
                    error: `Unexpected error: ${e.message || 'Unknown error'}`,
                  });
                }
              }),
            );

            if (errors.length > 0) {
              console.error('Process import errors:', errors);
              Modal.error({
                title: 'Process Import Errors',
                content: (
                  <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                    <p>Failed to import the following processes:</p>
                    <ul>
                      {errors.map((error, index) => (
                        <li key={index}>
                          <strong>{error.fileName}:</strong> {error.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                ),
                width: 600,
              });
            }

            if (processesData.length > 0) {
              setImportProcessData(processesData);
            }
            return false;
          } catch (e: any) {
            console.error('Critical import error:', e);
            Modal.error({
              title: 'Critical Import Error',
              content: `A critical error occurred during import: ${e.message || 'Unknown error occurred'}`,
            });
            return false;
          }
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
