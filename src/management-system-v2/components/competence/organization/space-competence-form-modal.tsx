'use client';

import { useEffect, useState } from 'react';
import { Modal, Form, Input, Checkbox, InputNumber, Radio, Alert } from 'antd';
import { SpaceCompetence } from '@/lib/data/competence-schema';

const { TextArea } = Input;

type SpaceCompetenceFormModalProps = {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: any) => void;
  editingCompetence: SpaceCompetence | null;
  loading: boolean;
};

const SpaceCompetenceFormModal: React.FC<SpaceCompetenceFormModalProps> = ({
  open,
  onCancel,
  onSubmit,
  editingCompetence,
  loading,
}) => {
  const [form] = Form.useForm();
  const [unclaimDecisionMade, setUnclaimDecisionMade] = useState(false);

  const hasClaimedUsers = editingCompetence && editingCompetence.claimedBy.length > 0;

  useEffect(() => {
    if (open) {
      if (editingCompetence) {
        form.setFieldsValue({
          name: editingCompetence.name,
          description: editingCompetence.description,
          externalQualificationNeeded: editingCompetence.externalQualificationNeeded,
          renewalTimeInterval: editingCompetence.renewalTimeInterval,
          unclaimForAllUsers: undefined, // No default selection
        });
        setUnclaimDecisionMade(false);
      } else {
        form.resetFields();
        setUnclaimDecisionMade(true); // Not needed for create
      }
    }
  }, [open, editingCompetence, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onSubmit(values);
    } catch (error) {
      // Validation failed
    }
  };

  return (
    <Modal
      title={editingCompetence ? 'Edit Space Competence' : 'Create Space Competence'}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={loading}
      okText={editingCompetence ? 'Update' : 'Create'}
      okButtonProps={{
        disabled: !!hasClaimedUsers && !unclaimDecisionMade,
      }}
      width={600}
    >
      <Form form={form} layout="vertical">
        {hasClaimedUsers && (
          <Alert
            message={`⚠️ This competence is claimed by ${editingCompetence.claimedBy.length} user${editingCompetence.claimedBy.length > 1 ? 's' : ''}`}
            type="warning"
            style={{ marginBottom: 16 }}
          />
        )}

        <Form.Item
          name="name"
          label="Competence Name"
          rules={[{ required: true, message: 'Please enter a competence name' }]}
        >
          <Input placeholder="e.g., Python Programming, Project Management" />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
          rules={[{ required: true, message: 'Please enter a description' }]}
        >
          <TextArea rows={3} placeholder="Describe this competence" />
        </Form.Item>

        <Form.Item name="externalQualificationNeeded" valuePropName="checked">
          <Checkbox>External Qualification Required</Checkbox>
        </Form.Item>

        <Form.Item
          name="renewalTimeInterval"
          label="Renewal Interval (months)"
          tooltip="How often should this competence be renewed?"
        >
          <InputNumber min={1} placeholder="Optional" style={{ width: '100%' }} />
        </Form.Item>

        {hasClaimedUsers && (
          <Form.Item
            name="unclaimForAllUsers"
            label="How should existing claims be handled?"
            rules={[{ required: true, message: 'Please select an option' }]}
          >
            <Radio.Group onChange={(e) => setUnclaimDecisionMade(e.target.value !== undefined)}>
              <Radio value={false} style={{ display: 'block', marginBottom: 12 }}>
                <strong>Keep claimed for all users</strong>
                <div style={{ color: '#666', fontSize: '12px', marginTop: 4 }}>
                  Preserves user proficiency data and qualification dates.
                </div>
              </Radio>
              <Radio value={true} style={{ display: 'block' }}>
                <strong>Unclaim for all users</strong>
                <div style={{ color: '#666', fontSize: '12px', marginTop: 4 }}>
                  Removes this competence from all users. They can re-claim if needed.
                </div>
              </Radio>
            </Radio.Group>
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default SpaceCompetenceFormModal;
