'use client';

import React, { useEffect, useMemo, useState } from 'react';

import { PlusOutlined } from '@ant-design/icons';

import { Button, Divider, Form, FormInstance, Input, Modal, Select, Space } from 'antd';

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
      Create Milestone
    </Button>
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
        <ModalSubmitButton key="submit" form={form} onSubmit={close}></ModalSubmitButton>,
      ]}
    >
      <Form form={form} name="name" wrapperCol={{ span: 24 }} autoComplete="off">
        <Form.Item
          name="id"
          rules={[{ required: true, message: 'Please input the Milestone ID!' }]}
        >
          <Input placeholder="Milestone ID" />
        </Form.Item>
        <Form.Item
          name="name"
          rules={[{ required: true, message: 'Please input the Milestone Name!' }]}
        >
          <Input placeholder="Milestone Name" />
        </Form.Item>
        <Form.Item name="description">
          <Input.TextArea
            showCount
            maxLength={150}
            style={{ height: 100 }}
            placeholder="Milestone Description"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

type MilestoneSelectionProperties = {
  milestones: { id: string; name: string; description?: string }[];
  onSelection: (values: { id: string; name: string; description?: string }[]) => void;
};

const MilestoneSelection: React.FC<MilestoneSelectionProperties> = ({
  milestones,
  onSelection,
}) => {
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);

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
            onSelection(
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
      <MilestoneModal
        show={isMilestoneModalOpen}
        close={(values) => {
          if (values) {
            onSelection([...milestones, values]);
          }

          setIsMilestoneModalOpen(false);
        }}
      ></MilestoneModal>
    </>
  );
};

export default MilestoneSelection;
