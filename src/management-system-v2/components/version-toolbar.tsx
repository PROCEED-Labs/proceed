'use client';

import {
  setDefinitionsId,
  setDefinitionsName,
  manipulateElementsByTagName,
  generateDefinitionsId,
  getUserTaskFileNameMapping,
} from '@proceed/bpmn-helper';

import React from 'react';

import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry';

import { Tooltip, Space } from 'antd';

import { FormOutlined, PlusOutlined } from '@ant-design/icons';

import useModelerStateStore from '@/lib/use-modeler-state-store';
import { useParams, useRouter } from 'next/navigation';
import { get, del, put, usePostAsset } from '@/lib/fetch-data';
import { convertToEditableBpmn } from '@/lib/helpers/processVersioning';
import { asyncForEach, asyncMap } from '@/lib/helpers/javascriptHelpers';
import ProcessCreationButton from './process-creation-button';
import { AuthCan } from '@/components/auth-can';
import ConfirmationButton from './confirmation-button';

type VersionToolbarProps = {};
const VersionToolbar: React.FC<VersionToolbarProps> = () => {
  const router = useRouter();
  const modeler = useModelerStateStore((state) => state.modeler);
  const selectedElementId = useModelerStateStore((state) => state.selectedElementId);
  const { mutateAsync: postProcess } = usePostAsset('/process');

  // const [index, setIndex] = useState(0);
  const { processId } = useParams();

  let selectedElement;

  if (modeler) {
    const elementRegistry = modeler.get('elementRegistry') as ElementRegistry;

    selectedElement = selectedElementId
      ? elementRegistry.get(selectedElementId)!
      : elementRegistry.getAll().filter((el) => el.businessObject.$type === 'bpmn:Process')[0];
  }

  const createNewProcess = async (values: { name: string; description?: string }) => {
    const saveXMLResult = await modeler?.saveXML({ format: true });
    if (saveXMLResult?.xml) {
      try {
        const bpmn = saveXMLResult.xml;
        const defId = generateDefinitionsId();
        let newBpmn = await setDefinitionsId(bpmn, defId);
        newBpmn = await setDefinitionsName(newBpmn, values.name);
        newBpmn = (await manipulateElementsByTagName(
          newBpmn,
          'bpmn:Definitions',
          (definitions: any) => {
            delete definitions.version;
            delete definitions.versionName;
            delete definitions.versionDescription;
            delete definitions.versionBasedOn;
          },
        )) as string;

        await postProcess({
          body: { bpmn: newBpmn, departments: [] },
        });
      } catch (err) {
        console.log(err);
      }
    }
  };

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
    const saveXMLResult = await modeler?.saveXML({ format: true });

    // Retrieve editable bpmn of latest version
    const { data: editableProcessData } = await get('/process/{definitionId}', {
      params: { path: { definitionId: processId as string } },
    });
    const editableBpmn = editableProcessData?.bpmn;

    if (saveXMLResult?.xml && editableBpmn) {
      const currentVersionBpmn = saveXMLResult.xml;

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
              createProcess={createNewProcess}
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
