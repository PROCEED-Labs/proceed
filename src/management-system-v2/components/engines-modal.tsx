import { useRef } from 'react';
import { Form, Input, Modal, ModalProps, Select, Space } from 'antd';

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
    port: '33029',
    hostname: '',
  };
}

const ConnectionsModal = ({
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
  const previousProtocol = useRef<string | undefined>(initialData.protocol);

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

        <Form.Item label="Host" required htmlFor="engine-modal-hostname-input">
          <Space.Compact style={{ width: '100%' }}>
            <Space.Addon style={{ padding: 0, border: 0 }}>
              <Form.Item name="protocol" noStyle>
                <Select
                  style={{ flex: 0, backgroundColor: 'inherit', width: 'fit-content' }}
                  popupMatchSelectWidth={false}
                  // Set the default port if the protocol changes (only if the user did not yet manually change the protocol)
                  onChange={(protocol) => {
                    const currentPort = form.getFieldValue('port');
                    const isPortEmpty = currentPort === undefined || currentPort === '';
                    // now we check if the port is the default for the previous protocol, meaning the user did not change the port manually. If the user did change the port, we will not change it automatically.
                    const defaultPortForPreviousProtocol =
                      previousProtocol.current === 'mqtt:'
                        ? '1883'
                        : previousProtocol.current === 'mqtts:'
                          ? '8883'
                          : '33029';
                    const portLooksDefault = currentPort === defaultPortForPreviousProtocol;

                    let nextPort = currentPort;
                    if (isPortEmpty || portLooksDefault) {
                      nextPort =
                        protocol === 'mqtt:' ? '1883' : protocol === 'mqtts:' ? '8883' : '33029';
                    }

                    previousProtocol.current = protocol as string;
                    form.setFieldsValue({ protocol, port: nextPort });
                  }}
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
            </Space.Addon>
            <Form.Item
              name="hostname"
              rules={[
                {
                  required: true,
                  message:
                    'Please specify the communication protocol and IP address / DNS name /Docker service name where a PROCEED Engine is reachable.',
                },
              ]}
              noStyle
            >
              <Input id="engine-modal-hostname-input" />
            </Form.Item>
          </Space.Compact>
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

export default ConnectionsModal;
