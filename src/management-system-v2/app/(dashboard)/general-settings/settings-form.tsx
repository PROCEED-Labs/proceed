'use client';

import { App, Button, Form, Select, Table } from 'antd';
import { ApiData } from '@/lib/fetch-data';
import { useRouter } from 'next/navigation';

type Settings = ApiData<'/settings', 'get'>;

type SettingsFormProps = {
  settings: Settings;
  updateSettings: (newSettings: Object) => Promise<void>;
};

const SettingsForm = ({ settings, updateSettings }: SettingsFormProps) => {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const router = useRouter();

  async function submitForm(values: Partial<Settings>) {
    try {
      await updateSettings(values);
      message.open({ type: 'success', content: 'Settings Updated Successfully' });
      router.refresh();
    } catch (e) {
      message.open({ type: 'error', content: 'Something went wrong' });
    }
  }

  return (
    <Form initialValues={settings} onFinish={submitForm} form={form}>
      <Table
        dataSource={[
          {
            title: 'Log Level',
            value: (
              <Form.Item
                name={'logLevel' as keyof Settings}
                style={{ margin: '0', width: 'max-content' }}
              >
                <Select
                  options={[
                    { value: 'error' },
                    { value: 'warn' },
                    { value: 'info' },
                    { value: 'http' },
                    { value: 'verbose' },
                    { value: 'debug' },
                    { value: 'silly' },
                  ]}
                />
              </Form.Item>
            ),
          },
        ]}
        columns={[
          { dataIndex: 'title', width: '20%' },
          { dataIndex: 'value', width: '50%' },
        ]}
        showHeader={false}
        pagination={false}
      />
      <div style={{ position: 'sticky', bottom: '0', marginTop: 20 }}>
        <Button type="primary" onClick={form.submit}>
          Save
        </Button>
      </div>
    </Form>
  );
};

export default SettingsForm;
