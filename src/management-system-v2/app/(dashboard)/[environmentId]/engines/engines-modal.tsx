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
  const [form] = Form.useForm<{ address: string; ownName: string }>();

  const values = Form.useWatch([], form);

  return (
    <Modal
      width="33vw"
      open={open}
      onCancel={() => close()}
      title={title}
      onOk={() => {
        close({ ownName: values.ownName, address: values.address });
      }}
      destroyOnClose={true}
    >
      <Form
        layout="vertical"
        initialValues={initialData}
        form={form}
        name="versioning"
        wrapperCol={{ span: 24 }}
        autoComplete="off"
        preserve={false}
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
