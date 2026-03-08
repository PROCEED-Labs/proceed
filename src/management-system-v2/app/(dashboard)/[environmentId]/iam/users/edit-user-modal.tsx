'use client';
import { App, Button, Col, Divider, Form, Input, Modal, Row, Select, Typography } from 'antd';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useEnvironment } from '@/components/auth-can';
import { wrapServerCall } from '@/lib/wrap-server-call';
import { getOrganigram } from '@/lib/data/organigram';
import { updateUserByAdmin } from '@/lib/data/environment-memberships';
import { OrganigramFields } from './organigram-fields';
import { useQuery } from '@tanstack/react-query';
import { isUserErrorResponse } from '@/lib/user-error';
import { ListUser } from '@/components/user-list';
import useOrganizationRoles from './use-org-roles';
export function EditUserModal({
  open,
  close,
  user,
}: {
  open: boolean;
  close: () => void;
  user: ListUser | null;
}) {
  const [form] = Form.useForm();
  const app = App.useApp();
  const router = useRouter();
  const { spaceId } = useEnvironment();
  // Fetch existing organigram data for this user
  const { data: organigram } = useQuery({
    queryKey: ['organigram', user?.id, spaceId],
    enabled: !!user?.id && open,
    queryFn: async () => {
      const result = await getOrganigram(spaceId, user!.id);
      if (isUserErrorResponse(result)) throw new Error();
      return result;
    },
  });
  // Fetch current roles for this user
  const userRoles = ((user as any)?.roles as { id: string; name: string; type: string }[]) ?? [];
  // Split current roles by type
  const currentDefaultRoleIds = userRoles.filter((r) => r.type === 'default').map((r) => r.id);
  const currentTeamRoleId = userRoles.find((r) => r.type === 'team')?.id;
  const currentBackOfficeRoleId = userRoles.find((r) => r.type === 'back-office')?.id;
  // For the default roles dropdown
  const { roles: allDefaultRoles } = useOrganizationRoles(spaceId, 'default');
  // Populate form when user or organigram data changes
  useEffect(() => {
    if (open && user) {
      form.setFieldsValue({
        firstName: user.firstName?.value ?? '',
        lastName: user.lastName?.value ?? '',
        username: user.username?.value ?? '',
        roles: currentDefaultRoleIds,
        teamRoleId: organigram?.teamRoleId ?? currentTeamRoleId ?? undefined,
        directManagerId: organigram?.directManagerId ?? undefined,
        backOfficeRoleId: organigram?.backOfficeRoleId ?? currentBackOfficeRoleId ?? undefined,
      });
    }
  }, [open, user, organigram, form]);
  function handleClose() {
    form.resetFields();
    close();
  }
  async function submitEdit(values: any) {
    if (!user) return;
    await wrapServerCall({
      fn: () =>
        updateUserByAdmin(spaceId, user.id, {
          firstName: values.firstName,
          lastName: values.lastName,
          username: values.username,
          roles: values.roles ?? [],
          teamRoleId: values.teamRoleId ?? null,
          directManagerId: values.directManagerId ?? null,
          backOfficeRoleId: values.backOfficeRoleId ?? null,
        }),
      onSuccess: () => {
        router.refresh();
        app.message.success('User updated');
        handleClose();
      },
      app,
    });
  }
  return (
    <Modal open={open} onCancel={handleClose} title="Edit User" footer={null} width={500}>
      <Form form={form} layout="vertical" onFinish={submitEdit}>
        {/* Basic Info */}
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="firstName" label="First Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="username" label="Username" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        {/* Default Roles */}
        <Divider />
        <Typography.Title level={5} style={{ marginBottom: '0.5rem' }}>
          Roles
        </Typography.Title>
        <Form.Item name="roles">
          <Select
            mode="multiple"
            allowClear
            style={{ width: '100%' }}
            placeholder="Select roles"
            options={(allDefaultRoles ?? []).map((r) => ({ label: r.name, value: r.id }))}
          />
        </Form.Item>
        {/* Organigram Fields (Team, Direct Manager, Back Office) */}
        <OrganigramFields spaceId={spaceId} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="primary" htmlType="submit">
            Save
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
