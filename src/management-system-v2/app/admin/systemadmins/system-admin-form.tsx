import { useSuspenseQuery } from '@tanstack/react-query';
import { App, Button, Form, FormProps, Select } from 'antd';
import { addAdmin as addAdmins, getNonAdminUsers } from './page';
import UserList from '@/components/user-list';
import { PlusOutlined } from '@ant-design/icons';
import React, { useState, useTransition } from 'react';

export function SystemAdminCreation({
  formProps,
  getNonAdminUsers,
  addAdmins: serverAddAdmins,
  onFinish,
}: {
  formProps?: FormProps;
  getNonAdminUsers: getNonAdminUsers;
  addAdmins: addAdmins;
  onFinish: () => void;
}) {
  const { message, notification } = App.useApp();

  const { data } = useSuspenseQuery({
    queryFn: async () => {
      const response = await getNonAdminUsers();
      if ('error' in response) throw response.error;
      return response;
    },
    queryKey: ['non-admin-users'],
  });

  const [usersPicked, setUsersPicked] = useState<string[] | undefined>();
  const [adding, startAddingTransition] = useTransition();

  function addAdmins(values: any) {
    startAddingTransition(async () => {
      try {
        const admins = usersPicked!.map((userId) => ({
          userId,
          role: values.role,
        }));

        const response = await serverAddAdmins(admins);
        if (response && 'error' in response) throw response.error.message;

        message.open({ type: 'success', content: `Admin${admins.length > 1 ? 's' : ''} added` });
        // NOTE: since this element is destroyed after finishing, whe don't refetch the data
        onFinish();
      } catch (error) {
        if (typeof error === 'string' || React.isValidElement(error))
          return notification.open({
            type: 'error',
            message: error,
          });

        message.open({ type: 'error', content: 'Something went wrong' });
      }
    });
  }

  if (!usersPicked)
    return (
      <UserList
        users={data.users}
        selectedRowActions={(selection) => (
          <Button type="text" onClick={() => setUsersPicked(selection)} icon={<PlusOutlined />} />
        )}
        columns={[
          {
            render: (_, user) => (
              <Button onClick={() => setUsersPicked([user.id])} icon={<PlusOutlined />} />
            ),
          },
        ]}
      />
    );

  return (
    <Form {...formProps} onFinish={addAdmins} initialValues={{ role: 'admin' }}>
      <Form.Item name="role" style={{ maxWidth: '30ch' }}>
        <Select>
          <Select.Option value="admin">Admin</Select.Option>
        </Select>
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={adding}>
        Add admin{usersPicked.length > 1 ? 's' : ''}
      </Button>
    </Form>
  );
}
