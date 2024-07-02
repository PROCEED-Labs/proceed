'use client';

import PhoneInput from '@/components/phone-input';
import {
  OrganizationEnvironment,
  UserOrganizationEnvironmentInputSchema,
} from '@/lib/data/environment-schema';
import { updateOrganization as serverUpdateOrganization } from '@/lib/data/environments';
import useParseZodErrors, { antDesignInputProps } from '@/lib/useParseZodErrors';
import { App, Button, Form, Table, Input } from 'antd';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

const SpaceSettings = ({ organization }: { organization: OrganizationEnvironment }) => {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const router = useRouter();
  const [errors, parseInput] = useParseZodErrors(UserOrganizationEnvironmentInputSchema);

  const [updating, startUpdating] = useTransition();
  function updateOrganization(input: unknown) {
    const data = parseInput(input);
    if (!data) return;

    startUpdating(async () => {
      try {
        const result = await serverUpdateOrganization(organization.id, data);

        if ('error' in result) throw result.error.message;

        message.open({
          content: 'Organization updated',
          type: 'success',
        });
        router.refresh();
      } catch (e) {
        let content = typeof e === 'string' ? e : 'Something went wrong';

        message.open({ content, type: 'error' });
      }
    });
  }

  return (
    <Form form={form} initialValues={organization} onFinish={updateOrganization}>
      <Table
        loading={updating}
        dataSource={[
          {
            key: 'name',
            title: 'Name',
            value: (
              <Form.Item
                name="name"
                style={{ margin: '0', width: '100%' }}
                {...antDesignInputProps(errors, 'name')}
              >
                <Input />
              </Form.Item>
            ),
          },
          {
            key: 'description',
            title: 'Description',
            value: (
              <Form.Item
                name="description"
                style={{ margin: '0', width: '100%' }}
                {...antDesignInputProps(errors, 'description')}
              >
                <Input.TextArea />
              </Form.Item>
            ),
          },
          {
            key: 'contactPhoneNumber',
            title: 'Phone Number',
            value: (
              <Form.Item
                name="contactPhoneNumber"
                style={{ margin: '0', width: '100%' }}
                {...antDesignInputProps(errors, 'contactPhoneNumber')}
              >
                <PhoneInput />
              </Form.Item>
            ),
          },
        ]}
        columns={[
          {
            dataIndex: 'title',
            width: '20%',
            render: (title, record) => <label htmlFor={record.key}>{title}</label>,
          },
          { dataIndex: 'value', width: '50%' },
        ]}
        showHeader={false}
        pagination={false}
      />
      <div style={{ position: 'sticky', bottom: '0', marginTop: 20 }}>
        <Button type="primary" onClick={form.submit} disabled={updating}>
          Save
        </Button>
      </div>
    </Form>
  );
};

export default SpaceSettings;
