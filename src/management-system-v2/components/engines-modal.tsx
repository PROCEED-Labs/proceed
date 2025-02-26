import { Form, Input, Modal, ModalProps } from 'antd';

const EnginesModal = ({
  open,
  close,
  title,
  initialData,
  modalProps,
}: {
  open: boolean;
  close: (data?: { address: string; name: string }) => void;
  title: string;
  initialData?: { address: string; name: string };
  modalProps?: ModalProps;
}) => {
  const [form] = Form.useForm<{ address: string; name: string }>();

  const values = Form.useWatch([], form);

  return (
    <Modal
      width="33vw"
      open={open}
      onCancel={() => close()}
      title={title}
      onOk={() => close({ name: values.name, address: values.address })}
      destroyOnClose={true}
      {...modalProps}
    >
      <Form
        layout="vertical"
        initialValues={initialData}
        form={form}
        name="versioning"
        wrapperCol={{ span: 24 }}
        autoComplete="off"
        preserve={false}
        onFinish={() => close({ name: values.name, address: values.address })}
      >
        <Form.Item
          name="address"
          label="Address"
          rules={[{ required: true, message: 'Please input the Address!' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item name="name" label="Name" rules={[{ required: false }]}>
          <Input />
        </Form.Item>
        {/* Needed for submitting the form pressing enter */}
        <button type="submit" style={{ display: 'none' }} />
      </Form>
    </Modal>
  );
};

export default EnginesModal;
