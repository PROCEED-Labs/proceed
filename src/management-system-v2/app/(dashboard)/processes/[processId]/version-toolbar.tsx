'use client';

import {
  setDefinitionsId,
  setDefinitionsName,
  manipulateElementsByTagName,
  generateDefinitionsId,
  getUserTaskFileNameMapping,
  toBpmnObject,
  getDefinitionsVersionInformation,
  setDefinitionsVersionInformation,
  setUserTaskData,
  toBpmnXml,
} from '@proceed/bpmn-helper';

import React, { useMemo } from 'react';

import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry';

import { Tooltip, Space } from 'antd';

import { FormOutlined, PlusOutlined } from '@ant-design/icons';

import useModelerStateStore from './use-modeler-state-store';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { get, del, put } from '@/lib/fetch-data';
import { asyncForEach, asyncMap } from '@/lib/helpers/javascriptHelpers';
import ProcessCreationButton from '@/components/process-creation-button';
import { AuthCan } from '@/components/auth-can';
import ConfirmationButton from '@/components/confirmation-button';
import { copyProcesses } from '@/lib/data/processes';

// TODO: refactor to server, this is from version-helper
async function convertToEditableBpmn(bpmn: string) {
  let bpmnObj = await toBpmnObject(bpmn);

  const { version } = await getDefinitionsVersionInformation(bpmnObj);

  bpmnObj = (await setDefinitionsVersionInformation(bpmnObj, {
    versionBasedOn: version,
  })) as object;

  const changedFileNames = {} as { [key: string]: string };

  const fileNameMapping = await getUserTaskFileNameMapping(bpmnObj);

  await asyncForEach(Object.entries(fileNameMapping), async ([userTaskId, { fileName }]) => {
    if (fileName) {
      const [unversionedName] = fileName.split('-');
      changedFileNames[fileName] = unversionedName;
      await setUserTaskData(bpmnObj, userTaskId, unversionedName);
    }
  });

  return { bpmn: await toBpmnXml(bpmnObj), changedFileNames };
}

type VersionToolbarProps = { processId: string };
const VersionToolbar = ({ processId }: VersionToolbarProps) => {
  const router = useRouter();
  const modeler = useModelerStateStore((state) => state.modeler);
  const selectedElementId = useModelerStateStore((state) => state.selectedElementId);
  const query = useSearchParams();
  // This component should only be rendered when a version is selected
  const selectedVersionId = query.get('version') as string;

  const selectedElement = useMemo(() => {
    if (modeler) {
      return selectedElementId
        ? modeler.getElement(selectedElementId)
        : modeler.getProcessElement();
    }
  }, [modeler, selectedElementId]);

  const getUsedFileNames = async (bpmn: string) => {
    const userTaskFileNameMapping = await getUserTaskFileNameMapping(bpmn);

    const fileNames = new Set<string>();

    Object.values(userTaskFileNameMapping).forEach(({ fileName }) => {
      if (fileName) {
        fileNames.add(fileName);
      }
    });

    return [...fileNames];
  };

  const getHtmlMappingByFileName = async () => {
    // Retrieve all stored userTask fileNames and corresponding html
    const { data } = await get('/process/{definitionId}/user-tasks', {
      params: { path: { definitionId: processId as string } },
    });
    const existingUserTaskFileNames = data || [];

    const htmlMappingByFileName = {} as { [userTaskId: string]: string };
    await asyncForEach(existingUserTaskFileNames, async (existingUserTaskFileName) => {
      const { data: html } = await get('/process/{definitionId}/user-tasks/{userTaskFileName}', {
        params: {
          path: {
            definitionId: processId as string,
            userTaskFileName: existingUserTaskFileName,
          },
        },
        parseAs: 'text',
      });

      if (html) {
        htmlMappingByFileName[existingUserTaskFileName] = html;
      }
    });
    return htmlMappingByFileName;
  };

  const setAsLatestVersion = async () => {
    const xml = await modeler!.getXML();

    // Retrieve editable bpmn of latest version
    const { data: editableProcessData } = await get('/process/{definitionId}', {
      params: { path: { definitionId: processId as string } },
    });
    const editableBpmn = editableProcessData?.bpmn;

    if (xml && editableBpmn) {
      const currentVersionBpmn = xml;

      const htmlMappingByFileName = await getHtmlMappingByFileName();

      const { bpmn: convertedBpmn, changedFileNames } =
        await convertToEditableBpmn(currentVersionBpmn);

      // Delete UserTasks stored for latest version
      const fileNamesInEditableVersion = await getUsedFileNames(editableBpmn);
      await asyncMap(fileNamesInEditableVersion, async (fileNameInEditableVersion: string) => {
        await del('/process/{definitionId}/user-tasks/{userTaskFileName}', {
          params: {
            path: {
              definitionId: processId as string,
              userTaskFileName: fileNameInEditableVersion,
            },
          },
        });
      });

      // Store UserTasks from this version as UserTasks from latest version
      await asyncMap(Object.entries(changedFileNames), async ([oldName, newName]) => {
        await put('/process/{definitionId}/user-tasks/{userTaskFileName}', {
          params: {
            path: { definitionId: processId as string, userTaskFileName: newName },
          },
          body: htmlMappingByFileName[oldName],
          headers: new Headers({
            'Content-Type': 'text/plain',
          }),
        });
      });

      // Store bpmn from this version as latest version
      await put('/process/{definitionId}', {
        params: { path: { definitionId: processId as string } },
        body: { bpmn: convertedBpmn },
      });

      router.push(`/processes/${processId as string}`);
    }
  };
  return (
    <div
      style={{
        position: 'absolute',
        zIndex: 10,
        padding: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
      }}
    >
      <Space.Compact size="large" direction="vertical">
        <AuthCan action="create" resource="Process">
          <Tooltip title="Create a new Process using this Version">
            <ProcessCreationButton
              icon={<PlusOutlined />}
              customAction={async (values) => {
                const result = await copyProcesses([
                  {
                    ...values,
                    originalId: processId as string,
                    originalVersion: selectedVersionId,
                  },
                ]);
                if (Array.isArray(result)) {
                  return result[0];
                } else {
                  // UserError was thrown by the server
                  return result;
                }
              }}
            ></ProcessCreationButton>
          </Tooltip>
        </AuthCan>

        <ConfirmationButton
          title="Are you sure you want to continue editing with this Version?"
          description="Any changes that are not stored in another version are irrecoverably lost!"
          tooltip="Set as latest Version and enable editing"
          onConfirm={setAsLatestVersion}
          buttonProps={{
            icon: <FormOutlined />,
          }}
        />
      </Space.Compact>
    </div>
  );
};

export default VersionToolbar;
