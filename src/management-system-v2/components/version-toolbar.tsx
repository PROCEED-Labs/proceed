'use client';

const {
  setDefinitionsId,
  setDefinitionsName,
  manipulateElementsByTagName,
  generateDefinitionsId,
} = require('@proceed/bpmn-helper');

import React, { useEffect, useState } from 'react';

import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry';

import { Tooltip, Button, Space, Modal, Form, Input } from 'antd';

import { FormOutlined, PlusOutlined } from '@ant-design/icons';

import useModelerStateStore from '@/lib/use-modeler-state-store';
import { useParams } from 'next/navigation';
import { FormInstance } from 'antd/es/form';
import { useGetAsset, post } from '@/lib/fetch-data';

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

type VersionToolbarProps = {};
const VersionToolbar: React.FC<VersionToolbarProps> = () => {
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);

  const modeler = useModelerStateStore((state) => state.modeler);
  const selectedElementId = useModelerStateStore((state) => state.selectedElementId);
  const setVersions = useModelerStateStore((state) => state.setVersions);

  // const [index, setIndex] = useState(0);
  const { processId } = useParams();

  const {
    isSuccess,
    data: processData,
    refetch: refetchProcess,
  } = useGetAsset('/process/{definitionId}', {
    params: { path: { definitionId: processId as string } },
  });

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

  const createNewProcess = async (values: { name: string; description: string }) => {
    const saveXMLResult = await modeler?.saveXML({ format: true });
    if (saveXMLResult?.xml) {
      const bpmn = saveXMLResult.xml;
      const defId = generateDefinitionsId();
      let newBpmn = await setDefinitionsId(bpmn, defId);
      newBpmn = await setDefinitionsName(newBpmn, values.name);
      newBpmn = await manipulateElementsByTagName(
        newBpmn,
        'bpmn:Definitions',
        (definitions: any) => {
          delete definitions.version;
          delete definitions.versionName;
          delete definitions.versionDescription;
          delete definitions.versionBasedOn;
        },
      );
      const response = await post('/process', {
        body: { bpmn: newBpmn, description: values.description, departments: [] },
        parseAs: 'text',
      });
    }
  };

  useEffect(() => {
    if (isSuccess) {
      setVersions(processData!.versions);
    }
  }, [isSuccess, processData, setVersions]);

  return (
    <>
      <div style={{ position: 'absolute', zIndex: 10, padding: '12px', top: '80px' }}>
        <Space.Compact size="large" direction="vertical">
          <Tooltip title="Create as new process">
            <Button icon={<PlusOutlined />} onClick={openNewProcessModal}></Button>
          </Tooltip>
          <Tooltip title="Make editable">
            <Button icon={<FormOutlined />}></Button>
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
    </>
  );
};

export default VersionToolbar;
