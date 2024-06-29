'use client';

import { Form, Input, Modal } from 'antd';
import { useEffect } from 'react';

const EnginesModal = ({
  open,
  close,
  title,
  initialData,
}: {
  open: boolean;
  close: (data?: { address: string; ownName: string }) => void;
  title: string;
  initialData?: { address: string; ownName: string };
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (initialData) {
      // form.resetFields is not working, because initialData has not been
      // updated in the internal form store, eventhough the prop has.
      form.setFieldsValue(initialData);
    }
  }, [form, initialData]);

  return (
    <Modal
      width="33vw"
      open={open}
      onCancel={() => close()}
      title={title}
      onOk={() => {
        close({ ownName: form.getFieldValue('ownName'), address: form.getFieldValue('address') });
        form.resetFields();
      }}
    >
      <Form
        layout="vertical"
        form={form}
        name="versioning"
        wrapperCol={{ span: 24 }}
        autoComplete="off"
      >
        <Form.Item
          name="address"
          label="Address"
          rules={[{ required: true, message: 'Please input the Address!' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item name="ownName" label="Own Name" rules={[{ required: false }]}>
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EnginesModal;
