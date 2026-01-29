import { Form, Input, Modal, ModalProps, Select } from 'antd';

type Protocol = 'http:' | 'https:' | 'mqtt:' | 'mqtts:';

function parseInitialData(data?: { address: string; name: string | null }) {
  if (data?.address) {
    try {
      const url = new URL(data.address);
      return {
        name: data?.name,
        protocol: url.protocol,
        port: url.port,
        hostname: url.hostname,
        username: url.username,
        password: url.password,
      };
    } catch (e) {}
  }
  return {
    name: data?.name,
    protocol: 'http:' as Protocol,
    port: '',
    hostname: '',
  };
}

const EnginesModal = ({
  open,
  close,
  title,
  initialData: _initialData,
  modalProps,
}: {
  open: boolean;
  close: (data?: { address: string; name: string | null }) => void;
  title: string;
  initialData?: { address: string; name: string | null };
  modalProps?: ModalProps;
}) => {
  const initialData = parseInitialData(_initialData);
  const [form] = Form.useForm<{
    name: string;
    protocol: string;
    port: string;
    hostname: string;
    username?: string;
    password?: string;
  }>();
  const values = Form.useWatch([], form);

  return (
    <Modal
      width="33vw"
      open={open}
      onCancel={() => close()}
      title={title}
      onOk={() => form.submit()}
      // This destroy is important so that the initialValues are applied when the modal is reopened
      destroyOnHidden={true}
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
        onFinish={(values) => {
          let address = values.hostname;

          if (values.port) {
            address += `:${values.port}`;
          }

          if (values.protocol === 'mqtt:') {
            if (values.username && values.password) {
              address = `${encodeURIComponent(values.username)}:${encodeURIComponent(values.password)}@${address}`;
            } else if (values.username) {
              address = `${encodeURIComponent(values.username)}@${address}`;
            }
          }

          address = `${values.protocol}//${address}`;

          close({ address, name: values.name || null });
        }}
      >
        <Form.Item name="name" label="Name" rules={[{ required: false }]}>
          <Input />
        </Form.Item>
        <Form.Item
          name="hostname"
          label="Host"
          rules={[{ required: true, message: 'Please input the Address!' }]}
        >
          <Input
            addonBefore={
              <Form.Item name="protocol" noStyle>
                <Select
                  defaultValue={'http:' satisfies Protocol}
                  options={
                    [
                      { value: 'http:', label: 'HTTP' },
                      { value: 'https:', label: 'HTTPS' },
                      { value: 'mqtt:', label: 'MQTT' },
                      { value: 'mqtts:', label: 'MQTTS' },
                    ] satisfies { value: Protocol; label: string }[]
                  }
                />
              </Form.Item>
            }
          />
        </Form.Item>
        <Form.Item name="port" label="Port" rules={[{ required: true }]} required>
          <Input />
        </Form.Item>

        {values?.protocol === 'mqtt:' && (
          <>
            <Form.Item name="username" label="Username" rules={[{ required: false }]}>
              <Input />
            </Form.Item>
            <Form.Item name="password" label="Password" rules={[{ required: false }]}>
              <Input />
            </Form.Item>
          </>
        )}

        {/* Needed for submitting the form pressing enter */}
        <button type="submit" style={{ display: 'none' }} />
      </Form>
    </Modal>
  );
};

export default EnginesModal;
