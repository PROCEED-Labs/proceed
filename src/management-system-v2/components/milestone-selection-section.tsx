'use client';

import React, { useState } from 'react';

import { PlusOutlined, CloseOutlined } from '@ant-design/icons';

import {
  Button,
  Divider,
  Drawer,
  Form,
  FormInstance,
  Grid,
  Input,
  Modal,
  Select,
  Space,
} from 'antd';
import { setProceedElement } from '@proceed/bpmn-helper';
import type { ElementLike } from 'diagram-js/lib/core/Types';
import Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import useModelerStateStore from '@/lib/use-modeler-state-store';
import FormSubmitButton from './form-submit-button';
import { Editor } from '@toast-ui/react-editor';
import TextEditor from './text-editor';

const MilestoneDescriptionEditor: React.FC<{ onChange: (content: string) => void }> = ({
  onChange,
}) => {
  const editorRef = React.useRef<Editor>(null);
  return (
    <TextEditor
      ref={editorRef}
      placeholder="Milestone Description"
      onChange={() => {
        const editor = editorRef.current as Editor;
        const editorInstance = editor.getInstance();
        const content = editorInstance.getMarkdown();
        onChange(content);
      }}
    ></TextEditor>
  );
};

const MilestoneForm: React.FC<{ form: FormInstance }> = ({ form }) => {
  return (
    <Form form={form} name="name" className="milestone-form">
      <Form.Item name="id" rules={[{ required: true, message: 'Please input the Milestone ID!' }]}>
        <Input placeholder="Milestone ID" />
      </Form.Item>
      <Form.Item
        name="name"
        rules={[{ required: true, message: 'Please input the Milestone Name!' }]}
      >
        <Input placeholder="Milestone Name" />
      </Form.Item>
      <Form.Item name="description" className="milestone-description">
        <MilestoneDescriptionEditor
          onChange={(content) => {
            form.setFieldValue('description', content);
          }}
        ></MilestoneDescriptionEditor>
      </Form.Item>
    </Form>
  );
};

const MilestoneDrawer: React.FC<MilestoneModalProperties> = ({ show, close }) => {
  const [form] = Form.useForm();
  return (
    <Drawer
      className="milestone-drawer"
      open={show}
      width={'100vw'}
      styles={{ body: { marginBottom: '1rem', overflowY: 'hidden' } }}
      closeIcon={false}
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Create new Milestone</span>
          <CloseOutlined onClick={() => close()}></CloseOutlined>
        </div>
      }
      footer={
        <Space style={{ display: 'flex', justifyContent: 'end' }}>
          <Button
            key="cancel"
            onClick={() => {
              close();
            }}
          >
            Cancel
          </Button>
          <FormSubmitButton
            key="submit"
            form={form}
            onSubmit={close}
            submitText="Create Milestone"
          ></FormSubmitButton>
        </Space>
      }
    >
      <MilestoneForm form={form}></MilestoneForm>
    </Drawer>
  );
};

type MilestoneModalProperties = {
  show: boolean;
  close: (values?: { id: string; name: string; description?: string }) => void;
};

const MilestoneModal: React.FC<MilestoneModalProperties> = ({ show, close }) => {
  const [form] = Form.useForm();

  return (
    <Modal
      title="Create new Milestone"
      width="50vw"
      open={show}
      onCancel={() => close()}
      footer={[
        <Button
          key="cancel"
          onClick={() => {
            close();
          }}
        >
          Cancel
        </Button>,
        <FormSubmitButton
          key="submit"
          form={form}
          onSubmit={close}
          submitText="Create Milestone"
        ></FormSubmitButton>,
      ]}
    >
      <MilestoneForm form={form}></MilestoneForm>
    </Modal>
  );
};

type MilestoneSelectionProperties = {
  milestones: { id: string; name: string; description?: string }[];
  selectedElement: ElementLike;
};

const MilestoneSelection: React.FC<MilestoneSelectionProperties> = ({
  milestones,
  selectedElement,
}) => {
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);

  const modeler = useModelerStateStore((state) => state.modeler);

  const breakpoint = Grid.useBreakpoint();

  const updateMilestones = (
    newMilestones: { id: string; name: string; description?: string }[],
  ) => {
    const modeling = modeler!.get('modeling') as Modeling;
    newMilestones.forEach((milestone) => {
      const milestoneExisting = !!milestones.find(
        (oldMilestone) => oldMilestone.id === milestone.id,
      );

      if (!milestoneExisting) {
        setProceedElement(selectedElement.businessObject, 'Milestone', undefined, milestone);
      }
    });

    // remove milestones that do not exist anymore
    milestones.forEach((oldMilestone) => {
      if (!newMilestones.find((milestone) => milestone.id === oldMilestone.id)) {
        setProceedElement(selectedElement.businessObject, 'Milestone', null, {
          id: oldMilestone.id,
        });
      }
    });

    modeling.updateProperties(selectedElement as any, {
      extensionElements: selectedElement.businessObject.extensionElements,
    });
  };

  return (
    <>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <b>Milestones</b>
        <Select
          style={{ width: '100%' }}
          mode="multiple"
          fieldNames={{ label: 'name', value: 'id' }}
          options={milestones}
          value={milestones.map((milestone) => ({ value: milestone.id, label: milestone.name }))}
          allowClear
          placeholder="Select Milestones"
          onChange={(_, selectedMilestones) => {
            updateMilestones(
              Array.isArray(selectedMilestones) ? selectedMilestones : [selectedMilestones],
            );
          }}
          dropdownRender={(menu) => (
            <>
              {menu}
              <Divider style={{ margin: '8px 0' }} />
              <Space style={{ padding: '0 8px 4px', display: 'flex', justifyContent: 'center' }}>
                <Button
                  type="text"
                  icon={<PlusOutlined />}
                  onClick={() => setIsMilestoneModalOpen(true)}
                >
                  Create new Milestone
                </Button>
              </Space>
            </>
          )}
        ></Select>
      </Space>
      {breakpoint.md ? (
        <MilestoneModal
          show={isMilestoneModalOpen}
          close={(values) => {
            if (values) {
              updateMilestones([...milestones, values]);
            }

            setIsMilestoneModalOpen(false);
          }}
        ></MilestoneModal>
      ) : (
        <MilestoneDrawer
          show={isMilestoneModalOpen}
          close={(values) => {
            if (values) {
              updateMilestones([...milestones, values]);
            }

            setIsMilestoneModalOpen(false);
          }}
        ></MilestoneDrawer>
      )}
    </>
  );
};

export default MilestoneSelection;
