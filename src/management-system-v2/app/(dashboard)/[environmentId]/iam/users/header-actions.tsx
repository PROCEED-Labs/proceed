'use client';

import { AuthCan, useEnvironment } from '@/components/auth-can';
import { inviteUsersToEnvironment } from '@/lib/data/environment-memberships';
import { wrapServerCall } from '@/lib/wrap-server-call';
import { getRoles } from '@/lib/data/roles';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Form,
  App,
  Input,
  Modal,
  Grid,
  FloatButton,
  Tag,
  Divider,
  Select,
  Typography,
} from 'antd';
import { DefaultOptionType } from 'antd/es/select';
import { useRouter } from 'next/navigation';
import { FC, use, useEffect, useState, useTransition } from 'react';
import { EnvVarsContext } from '@/components/env-vars-context';

const AddUsersModal: FC<{
  modalOpen: boolean;
  close: () => void;
}> = ({ modalOpen, close }) => {
  const app = App.useApp();
  const router = useRouter();
  const environment = useEnvironment();
  const [form] = Form.useForm();

  const [users, setUsers] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<DefaultOptionType[]>([]);

  const { data } = useQuery({
    queryFn: async () => {
      const roles = await getRoles(environment.spaceId);
      if ('error' in roles) throw new Error();
      return roles;
    },
    queryKey: ['roles', environment.spaceId],
  });
  const roles = data?.filter((role) => !['@guest', '@everyone'].includes(role.name));

  useEffect(() => {
    form.resetFields();
  }, [form, modalOpen]);

  const closeModal = () => {
    close();
    setUsers([]);
    form.resetFields();
  };

  const [isLoading, startTransition] = useTransition();
  const submitData = () => {
    startTransition(async () => {
      try {
        const roleIds = selectedRoles.map((role) => role.value as string);

        await wrapServerCall({
          fn: () => inviteUsersToEnvironment(environment.spaceId, users, roleIds),
          onSuccess: () => {
            app.message.success({ content: `User${users.length > 1 ? 's' : ''} invited` });
            router.refresh();
            closeModal();
          },
          app,
        });
        close();
      } catch (_) {}
    });
  };

  return (
    <Modal
      open={modalOpen}
      onCancel={closeModal}
      title="Invite New Users"
      closeIcon={null}
      okText="Invite Users"
      onOk={submitData}
      okButtonProps={{ loading: isLoading, disabled: users.length === 0 }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={({ email }) => {
          setUsers((prev) => {
            if (prev.includes(email)) return prev;
            return prev.concat(email);
          });
          form.resetFields();

          // This doesn't work without a timeout
          setTimeout(() => form.getFieldInstance('email').input.focus(), 0);
        }}
        style={{
          marginBottom: '0',
        }}
      >
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <Form.Item
            name="email"
            style={{ flexGrow: 1 }}
            rules={[{ type: 'email' }, { required: true }]}
          >
            <Input />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              <PlusOutlined />
            </Button>
          </Form.Item>
        </div>
      </Form>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem' }}>
        {users.map((user, idx) => (
          <Tag
            key={idx}
            onClose={() => setUsers((prev) => prev.filter((_, userIdx) => userIdx !== idx))}
            closeIcon
            style={{
              borderRadius: '20px',
              padding: '.2rem .7rem',
            }}
          >
            {user}
          </Tag>
        ))}
      </div>
      {roles && roles.length > 0 && users.length > 0 && (
        <>
          <Divider />

          <Typography.Title style={{ marginBottom: 0 }}>Roles</Typography.Title>
          <Typography.Text style={{ display: 'block', marginBottom: '0.5rem' }}>
            You can select roles for the users you're inviting
          </Typography.Text>

          <Select
            mode="multiple"
            allowClear
            style={{ width: '100%' }}
            placeholder="Select roles"
            onChange={(_, values) => setSelectedRoles(values as DefaultOptionType[])}
            options={roles.map((role) => ({ label: role.name, value: role.id }))}
          />
        </>
      )}
    </Modal>
  );
};

const HeaderActions: FC = () => {
  const env = use(EnvVarsContext);
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
  const breakpoint = Grid.useBreakpoint();

  return (
    <>
      <AddUsersModal modalOpen={createUserModalOpen} close={() => setCreateUserModalOpen(false)} />
      {/* TODO: for now we can only invite through email, we have to add username invites in the future */}
      {env.PROCEED_PUBLIC_MAILSERVER_ACTIVE && (
        <AuthCan create User>
          {/* TODO: fix icon for float button in button group */}
          <Button
            type="primary"
            onClick={() => setCreateUserModalOpen(true)}
            style={{ marginRight: '10px' }}
          >
            {breakpoint.xl ? 'New User' : 'New'}
          </Button>
        </AuthCan>
      )}
    </>
  );
};

export const FloatButtonActions: FC = () => {
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);

  return (
    <>
      <AddUsersModal modalOpen={createUserModalOpen} close={() => setCreateUserModalOpen(false)} />

      <AuthCan create User>
        <FloatButton
          type="primary"
          style={{ marginBottom: '60px', zIndex: '101' }}
          icon={<PlusOutlined />}
          onClick={() => setCreateUserModalOpen(true)}
        />
      </AuthCan>
    </>
  );
};

export default HeaderActions;
