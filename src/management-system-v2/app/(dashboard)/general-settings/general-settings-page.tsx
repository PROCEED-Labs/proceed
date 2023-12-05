'use client';
import { FC, useEffect } from 'react';
import { App, Button, Card, Form, Input, Result, Select, Space, Table, Typography } from 'antd';
import Content from '@/components/content';
import { ApiData, useGetAsset, usePutAsset } from '@/lib/fetch-data';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';

type Settings = ApiData<'/settings', 'get'>;

const GeneralSettingsPage: FC = () => {
  const {
    data: settings,
    isLoading: settingsLoading,
    error: settingsFetchError,
  } = useGetAsset('/settings', {});

  const { mutateAsync: changeSettings, isLoading: updatingSettings } = usePutAsset('/settings', {});

  const [form] = Form.useForm();
  const { message } = App.useApp();

  async function submitForm(values: Partial<Settings>) {
    try {
      await changeSettings({ body: values });
      message.open({ type: 'success', content: 'Settings Updated Successfully' });
    } catch (_) {
      message.open({ type: 'error', content: 'Something went wrong' });
    }
  }

  if (settingsFetchError)
    return (
      <Content title="General Management System Settings">
        <Result
          status="error"
          title="An error ocurred while fetching the settings"
          subTitle="Please try again"
        />
      </Content>
    );

  return (
    <Content title="General Management System Settings">
      <Card style={{ margin: 'auto', maxWidth: '45rem' }} loading={settingsLoading}>
        <Typography.Title level={3}>System Settings</Typography.Title>
        <Form initialValues={settings} onFinish={submitForm} form={form}>
          <Table
            loading={updatingSettings}
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
            <Button type="primary" onClick={form.submit} loading={updatingSettings}>
              Save
            </Button>
          </div>
        </Form>
      </Card>
    </Content>
  );
};

export default GeneralSettingsPage;
