'use client';

import React, { useState } from 'react';

import { Button, Modal, Upload } from 'antd';
import type { ButtonProps } from 'antd';

import {
  getDefinitionsName,
  getElementsByTagName,
  getProcessDocumentation,
  toBpmnObject,
} from '@proceed/bpmn-helper';
import ProcessModal from './process-modal';
import { importProcesses } from '@/lib/data/processes';
import { usePathname, useRouter } from 'next/navigation';
import { useEnvironment } from './auth-can';
import JSZip from 'jszip';
import { generateDateString } from '@/lib/utils';
import { checkIfAllReferencedArtefactsAreProvided } from '@/lib/helpers/import-helpers';

export type ProcessData = {
  name: string;
  description: string;
  creator?: string;
  creatorUsername?: string;
  createdOn?: string;
  userDefinedId?: string;
  folderId?: string;
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
  const path = usePathname();
  const currentFolderId = path.includes('/folder/') ? path.split('/folder/').pop() : undefined;

  const handleFileImport = async (fileList: File[]) => {
    const processesData: ProcessData[] = [];
    const errors: { fileName: string; error: string | React.ReactElement }[] = [];

    await Promise.all(
      fileList.map(async (file) => {
        try {
          if (file.type === 'application/zip') {
            await handleZipFile(file, processesData, errors);
          } else {
            await handleBpmnFile(file, processesData, errors);
          }
        } catch (error: any) {
          errors.push({ fileName: file.name, error: `Unexpected error: ${error.message}` });
        }
      }),
    );

    if (errors.length > 0) displayErrorModal(errors);
    if (processesData.length > 0) setImportProcessData(processesData);
  };

  const handleZipFile = async (file: File, processesData: ProcessData[], errors: any[]) => {
    try {
      const zip = await JSZip.loadAsync(file);
      const bpmnFiles = Object.keys(zip.files).filter((name) =>
        name.toLowerCase().endsWith('.bpmn'),
      );

      if (bpmnFiles.length === 0) {
        errors.push({ fileName: file.name, error: 'No BPMN files found in ZIP archive' });
        return;
      }

      await Promise.all(
        bpmnFiles.map(async (bpmnFilePath) => {
          await processBpmnFileFromZip(zip, bpmnFilePath, processesData, errors);
        }),
      );
    } catch (error: any) {
      errors.push({ fileName: file.name, error: `Failed to extract ZIP: ${error.message}` });
    }
  };

  const handleBpmnFile = async (file: File, processesData: ProcessData[], errors: any[]) => {
    try {
      const bpmn = await file.text();
      await parseBpmnContent(file.name, bpmn, processesData, errors);
    } catch (error: any) {
      errors.push({ fileName: file.name, error: `Failed to read file: ${error.message}` });
    }
  };

  const processBpmnFileFromZip = async (
    zip: JSZip,
    bpmnFilePath: string,
    processesData: ProcessData[],
    errors: any[],
  ) => {
    try {
      const bpmnFile = zip.files[bpmnFilePath];
      const bpmn = await bpmnFile.async('text');
      await parseBpmnContent(bpmnFilePath, bpmn, processesData, errors, zip);
    } catch (error: any) {
      errors.push({
        fileName: bpmnFilePath,
        error: `Failed to read file from ZIP: ${error.message}`,
      });
    }
  };

  const parseBpmnContent = async (
    bpmnFilePath: string,
    bpmn: string,
    processesData: ProcessData[],
    errors: any[],
    zip?: JSZip,
  ) => {
    try {
      const bpmnObj = await toBpmnObject(bpmn);
      const [definitions] = await getElementsByTagName(bpmnObj, 'bpmn:Definitions');
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
        creator: definitions['creatorName'],
        creatorUsername: definitions['creatorUsername'],
        createdOn: generateDateString(definitions['creationDate'], true),
        folderId: currentFolderId,
        bpmn,
        artefacts: {
          images: [],
          userTasks: [],
          scriptTasks: [],
        },
      };
      if (zip) {
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

              if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].some((ext) => name.endsWith(ext))) {
                const content = await file.async('base64');
                processData.artefacts!.images!.push({ name, content });
              } else if (['.js', '.ts'].some((ext) => name.endsWith(ext))) {
                const content = await file.async('text');
                processData.artefacts!.scriptTasks!.push({ name, content });
              } else if (['.json', '.html'].some((ext) => name.endsWith(ext))) {
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
      }

      const validationRes = await checkIfAllReferencedArtefactsAreProvided(bpmn, {
        images: processData.artefacts?.images?.map((item) => item.name) || [],
        userTasks: processData.artefacts?.userTasks?.map((item) => item.name) || [],
        scriptTasks: processData.artefacts?.scriptTasks?.map((item) => item.name) || [],
      });
      if (!validationRes.isValid) {
        errors.push({
          bpmnFilePath,
          error: generateMissingArtefactsError(bpmnFilePath, validationRes.missingArtefacts),
        });
        return;
      }

      processesData.push(processData);
    } catch (error: any) {
      errors.push({ bpmnFilePath, error: `Failed to parse BPMN: ${error.message}` });
    }
  };

  const generateMissingArtefactsError = (fileName: string, missingArtefacts: any) => (
    <div>
      <p>
        <strong>{fileName}: Missing referenced artefacts:</strong>
      </p>
      <ul>
        {Object.entries(missingArtefacts || {}).map(
          ([key, values]) =>
            (values as string[]).length > 0 && (
              <li key={key}>
                <strong>{key}:</strong> {(values as string[]).join(', ')}
              </li>
            ),
        )}
      </ul>
    </div>
  );

  const displayErrorModal = (errors: any[]) => {
    Modal.error({
      title: 'Process Import Errors',
      content: (
        <div style={{ maxHeight: '300px', overflow: 'auto' }}>
          <ul>
            {errors.map((error, index) => (
              <li key={index}>
                {typeof error.error === 'string'
                  ? `${error.fileName}: ${error.error}`
                  : error.error}
              </li>
            ))}
          </ul>
        </div>
      ),
      width: 600,
    });
  };

  return (
    <>
      <Upload
        accept=".bpmn, .zip"
        multiple
        showUploadList={false}
        beforeUpload={(_, fileList) => {
          handleFileImport(fileList);
          return false;
        }}
      >
        <Button {...props} />
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
        mode="import"
      />
    </>
  );
};

export default ProcessImportButton;
