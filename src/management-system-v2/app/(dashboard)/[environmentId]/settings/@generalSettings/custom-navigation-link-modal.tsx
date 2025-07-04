import { Checkbox, Form, Input, Modal, ModalProps, Select, Space } from 'antd';
import { Prettify } from '@/lib/typescript-utils';
import { useEffect } from 'react';
import { customLinkIcons } from '@/lib/custom-links/icons';
import { CustomNavigationLink } from '@/lib/custom-links/custom-link';

type Protocol = 'http:' | 'https:' | 'mqtt:' | 'mqtts:';

// TODO: remove all these types
function parseInitialData(data?: CustomNavigationLink): Prettify<
  Omit<CustomNavigationLink, 'address'> & {
    protocol: string;
    port: string;
    hostname: string;
    username: string;
    password: string;
  }
> {
  let parsedUrl;
  if (data?.address) {
    try {
      const url = new URL(data.address);
      parsedUrl = {
        protocol: url.protocol,
        port: url.port,
        hostname: url.hostname,
        username: url.username,
        password: url.password,
      };
    } catch (e) { }
  }

  if (!parsedUrl) {
    parsedUrl = {
      protocol: 'http:' as Protocol,
      port: '',
      hostname: '',
      username: '',
      password: '',
    };
  }

  if (!data)
    return {
      ...parsedUrl,
      name: '',
      icon: '',
      showStatus: false,
      clickable: false,
      position: 'bottom',
    };

  const { address, ...restData } = data;

  return { ...parsedUrl, ...restData };
}

export default function CustomLinkModal({
  open,
  close,
  title,
  initialData: _initialData,
  modalProps,
}: {
  open: boolean;
  close: (data?: CustomNavigationLink) => void;
  title: string;
  initialData?: CustomNavigationLink;
  modalProps?: ModalProps;
}) {
  const initialData = parseInitialData(_initialData);
  const [form] = Form.useForm<typeof initialData>();
  const values = Form.useWatch([], form);

  useEffect(() => {
    if (open) {
      form.setFieldsValue(initialData);
    }
  }, [open, form]); // initialData isn't memoized, so we don't include it in the dependency array

  return (
    <Modal
      open={open}
      onCancel={() => close()}
      title={title}
      onOk={async () => {
        await form.validateFields();
        form.submit();
      }}
      {...modalProps}
    >
      {open && (
        <Form
          layout="vertical"
          initialValues={initialData}
          form={form}
          name="versioning"
          wrapperCol={{ span: 24 }}
          autoComplete="off"
          preserve={false}
          onValuesChange={(changed, values) => {
            const changedProtocol = changed.protocol;
            if (!changedProtocol) return;

            const clickable = values.clickable;
            const showStatus = values.showStatus;

            if (changedProtocol.startsWith('mqtt')) {
              if (clickable) {
                form.setFieldValue('clickable', false);
              }
              if (!showStatus) {
                form.setFieldValue('showStatus', true);
              }
            }
          }}
          onFinish={(values) => {
            const { hostname, port, protocol, username, password, ...otherValues } = values;

            let address = hostname;

            if (port) {
              address += `:${port}`;
            }

            if (protocol === 'mqtt:') {
              if (username && values.password) {
                address = `${encodeURIComponent(username)}:${encodeURIComponent(values.password)}@${address}`;
              } else if (username) {
                address = `${encodeURIComponent(username)}@${address}`;
              }
            }

            address = `${protocol}//${address}`;

            close({ address, ...otherValues });
          }}
        >
          <Form.Item name="name" label="Name" required rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="icon" label="Icon" required rules={[{ required: true }]}>
            <Select
              options={customLinkIcons.map((opt) => ({
                label: (
                  <Space>
                    {opt.icon} {opt.label}
                  </Space>
                ),
                value: opt.value,
              }))}
            />
          </Form.Item>

          <Form.Item name="position" label="Position" required rules={[{ required: true }]}>
            <Select
              options={[
                {
                  label: 'Top',
                  value: 'top',
                },
                {
                  label: 'Bottom',
                  value: 'bottom',
                },
              ]}
            />
          </Form.Item>

          <Form.Item name="hostname" label="Host" required rules={[{ required: true }]}>
            <Input
              addonBefore={
                <Form.Item name="protocol" noStyle>
                  <Select
                    options={
                      [
                        { value: 'http:', label: 'HTTP://' },
                        { value: 'https:', label: 'HTTPS://' },
                        { value: 'mqtt:', label: 'MQTT://' },
                        { value: 'mqtts:', label: 'MQTTS://' },
                      ] satisfies { value: Protocol; label: string }[]
                    }
                  />
                </Form.Item>
              }
            />
          </Form.Item>

          <Form.Item name="port" label="Port">
            <Input />
          </Form.Item>

          {values?.protocol?.startsWith('mqtt') && (
            <>
              <Form.Item name="username" label="Username" rules={[{ required: false }]}>
                <Input />
              </Form.Item>
              <Form.Item name="password" label="Password" rules={[{ required: false }]}>
                <Input />
              </Form.Item>
            </>
          )}

          {values?.protocol?.startsWith('mqtt') && (
            <Form.Item name="topic" label="Topic">
              <Input />
            </Form.Item>
          )}

          <Form.Item
            name="showStatus"
            valuePropName="checked"
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const protocol = getFieldValue('protocol');
                  const clickable = getFieldValue('clickable');

                  if (protocol.startsWith('mqtt') && !value) {
                    return Promise.reject(new Error('Show Status must be enabled for MQTT links.'));
                  }

                  if (!clickable && !value) {
                    return Promise.reject(
                      new Error('Either Show Status or Clickable must be enabled.'),
                    );
                  }

                  return Promise.resolve();
                },
              }),
            ]}
          >
            <Checkbox>Show Status</Checkbox>
          </Form.Item>

          <Form.Item
            name="clickable"
            valuePropName="checked"
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const protocol = getFieldValue('protocol');
                  const showStatus = getFieldValue('showStatus');
                  const isMqtt = protocol.startsWith('mqtt');

                  if (isMqtt && value) {
                    return Promise.reject(new Error('Clickable cannot be enabled for MQTT links.'));
                  }

                  if (isMqtt && !value) {
                    return Promise.resolve();
                  }

                  if (!showStatus && !value) {
                    return Promise.reject(
                      new Error('Either Show Status or Clickable must be enabled.'),
                    );
                  }

                  return Promise.resolve();
                },
              }),
            ]}
          >
            <Checkbox>Clickable</Checkbox>
          </Form.Item>

          {/* Needed for submitting the form pressing enter */}
          <button type="submit" style={{ display: 'none' }} />
        </Form>
      )}
    </Modal>
  );
}
