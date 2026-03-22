'use client';
import { App, Button, Form, Modal } from 'antd';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useEnvironment } from '@/components/auth-can';
import { wrapServerCall } from '@/lib/wrap-server-call';
import { getOrganigram } from '@/lib/data/organigram';
import { updateMemberByAdmin } from '@/lib/data/environment-memberships';
import { useQuery } from '@tanstack/react-query';
import { isUserErrorResponse } from '@/lib/user-error';
import { ListUser } from '@/components/user-list';
import useOrganizationRoles from './use-org-roles';
import { UserFormFields } from './organigram-fields';

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

  // Fetch existing organigram data; the source of truth for team, backOffice, manager
  const { data: organigram } = useQuery({
    queryKey: ['organigram', user?.id, spaceId],
    enabled: !!user?.id && open,
    queryFn: async () => {
      const result = await getOrganigram(spaceId, user!.id);
      if (isUserErrorResponse(result)) throw new Error();
      return result;
    },
  });

  // All roles dropdown
  const { roles: allRoles } = useOrganizationRoles(spaceId);

  // Populate form when user or organigram data loads
  useEffect(() => {
    if (open && user) {
      form.setFieldsValue({
        roles: (user as typeof user & { roles?: { id: string }[] })?.roles?.map((r) => r.id) ?? [],
        teamRoleId: organigram?.teamRoleId ?? undefined,
        directManagerId: organigram?.directManagerId ?? undefined,
        backOfficeRoleId: organigram?.backOfficeRoleId ?? undefined,
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
        updateMemberByAdmin(spaceId, user.id, {
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
        <UserFormFields
          spaceId={spaceId}
          excludeUserId={user?.id ?? undefined}
          roles={allRoles ?? []}
        />
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
