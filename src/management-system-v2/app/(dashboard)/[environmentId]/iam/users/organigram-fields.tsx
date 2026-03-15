'use client';

import { Form, Select, Divider, Typography } from 'antd';
import useOrganizationRoles from './use-org-roles';
import { useQuery } from '@tanstack/react-query';
import { getSpaceUsers } from '@/lib/data/organigram';
import { isUserErrorResponse } from '@/lib/user-error';

export function OrganigramFields({
  spaceId,
  excludeUserId,
}: {
  spaceId: string;
  excludeUserId?: string;
}) {
  const { roles: teamRoles } = useOrganizationRoles(spaceId, 'team');
  const { roles: backOfficeRoles } = useOrganizationRoles(spaceId, 'back-office');

  const { data: spaceUsers } = useQuery({
    queryKey: ['space-users', spaceId],
    queryFn: async () => {
      const result = await getSpaceUsers(spaceId);
      if (isUserErrorResponse(result)) throw new Error();
      return result;
    },
  });

  // Filter out the current user from direct manager dropdown
  const filteredUsers = (spaceUsers ?? []).filter((u) => u.id !== excludeUserId);

  return (
    <>
      <Divider />
      <Typography.Title level={5} style={{ marginBottom: '0.5rem' }}>
        Organisation Info
      </Typography.Title>

      <Form.Item label="Team" name="teamRoleId">
        <Select
          allowClear
          placeholder="Select team"
          options={(teamRoles ?? []).map((r) => ({ label: r.name, value: r.id }))}
        />
      </Form.Item>

      <Form.Item label="Direct Manager" name="directManagerId">
        <Select
          allowClear
          placeholder="Select direct manager"
          options={filteredUsers.map((u) => ({
            label: u.username ?? u.email ?? u.id,
            value: u.id,
          }))}
        />
      </Form.Item>

      <Form.Item label="Back Office" name="backOfficeRoleId">
        <Select
          allowClear
          placeholder="Select back office"
          options={(backOfficeRoles ?? []).map((r) => ({ label: r.name, value: r.id }))}
        />
      </Form.Item>
    </>
  );
}
