'use client';

import {
  setDefinitionsId,
  setDefinitionsName,
  manipulateElementsByTagName,
  generateDefinitionsId,
  getUserTaskFileNameMapping,
  getDefinitionsVersionInformation,
  setDefinitionsVersionInformation,
  setUserTaskData,
  toBpmnObject,
  toBpmnXml,
} from '@proceed/bpmn-helper';

import React, { useEffect, useState } from 'react';

import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry';

import { Tooltip, Button, Space, Modal, Form, Input } from 'antd';

import { FormOutlined, PlusOutlined } from '@ant-design/icons';

import useModelerStateStore from '@/lib/use-modeler-state-store';
import { useParams, useRouter } from 'next/navigation';
import { FormInstance } from 'antd/es/form';
import { useGetAsset, post, get, del, put } from '@/lib/fetch-data';
import { areVersionsEqual, convertToEditableBpmn } from '@/lib/helpers/processVersioning';
import { asyncForEach, asyncMap } from '@/lib/helpers/javascriptHelpers';

const ModalSubmitButton = ({ form, onSubmit }: { form: FormInstance; onSubmit: Function }) => {
  const [submittable, setSubmittable] = useState(false);

  // Watch all values
  const values = Form.useWatch([], form);

  React.useEffect(() => {
    form.validateFields({ validateOnly: true }).then(
      () => {
        setSubmittable(true);
      },
      () => {
        setSubmittable(false);
      },
    );
  }, [form, values]);

  return (
    <Button
      type="primary"
      htmlType="submit"
      disabled={!submittable}
      onClick={() => {
        onSubmit(values);
        form.resetFields();
      }}
    >
      Create Process
    </Button>
  );
};

type ProcessModalProps = {
  show: boolean;
  close: (values?: { name: string; description: string }) => void;
};
const ProcessModal: React.FC<ProcessModalProps> = ({ show, close }) => {
  const [form] = Form.useForm();

  return (
    <Modal
      title="Create new Process"
      open={show}
      onCancel={() => {
        close();
      }}
      footer={[
        <Button
          key="cancel"
          onClick={() => {
            close();
          }}
        >
          Cancel
        </Button>,
        <ModalSubmitButton key="submit" form={form} onSubmit={close}></ModalSubmitButton>,
      ]}
    >
      <Form form={form} name="name" wrapperCol={{ span: 24 }} autoComplete="off">
        <Form.Item
          name="name"
          rules={[{ required: true, message: 'Please input the Process Name!' }]}
        >
          <Input placeholder="Process Name" />
        </Form.Item>
        <Form.Item
          name="description"
          rules={[{ required: true, message: 'Please input the Process Description!' }]}
        >
          <Input.TextArea
            showCount
            maxLength={150}
            style={{ height: 100 }}
            placeholder="Process Description"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

type ConfirmationModalProps = {
  show: boolean;
  close: () => void;
  confirm: () => void;
};
const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ show, close, confirm }) => {
  return (
    <Modal
      title="Are you sure you want to continue editing with this version?"
      open={show}
      onOk={() => {
        confirm();
      }}
      onCancel={() => {
        close();
      }}
    >
      <p>Any changes that are not stored in another version are irrecoverably lost!</p>
    </Modal>
  );
};

type VersionToolbarProps = {};
const VersionToolbar: React.FC<VersionToolbarProps> = () => {
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const router = useRouter();
  const modeler = useModelerStateStore((state) => state.modeler);
  const selectedElementId = useModelerStateStore((state) => state.selectedElementId);

  // const [index, setIndex] = useState(0);
  const { processId } = useParams();

  let selectedElement;

  if (modeler) {
    const elementRegistry = modeler.get('elementRegistry') as ElementRegistry;

    selectedElement = selectedElementId
      ? elementRegistry.get(selectedElementId)!
      : elementRegistry.getAll().filter((el) => el.businessObject.$type === 'bpmn:Process')[0];
  }

  const openNewProcessModal = () => {
    setIsProcessModalOpen(true);
  };

  const openConfirmationModal = () => {
    setIsConfirmationModalOpen(true);
  };

  const createNewProcess = async (values: { name: string; description: string }) => {
    const saveXMLResult = await modeler?.saveXML({ format: true });
    if (saveXMLResult?.xml) {
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
      const response = await post('/process', {
        body: { bpmn: newBpmn, /*description: values.description,*/ departments: [] },
        parseAs: 'text',
      });
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
    <>
      <div style={{ position: 'absolute', zIndex: 10, padding: '12px', top: '80px' }}>
        <Space.Compact size="large" direction="vertical">
          <Tooltip title="Create as new process">
            <Button icon={<PlusOutlined />} onClick={openNewProcessModal}></Button>
          </Tooltip>
          <Tooltip title="Make editable">
            <Button icon={<FormOutlined />} onClick={openConfirmationModal}></Button>
          </Tooltip>
        </Space.Compact>
      </div>
      <ProcessModal
        close={(values) => {
          setIsProcessModalOpen(false);

          if (values) {
            createNewProcess(values);
          }
        }}
        show={isProcessModalOpen}
      ></ProcessModal>
      <ConfirmationModal
        close={() => {
          setIsConfirmationModalOpen(false);
        }}
        confirm={() => {
          setAsLatestVersion();
          setIsConfirmationModalOpen(false);
        }}
        show={isConfirmationModalOpen}
      ></ConfirmationModal>
    </>
  );
};

export default VersionToolbar;
