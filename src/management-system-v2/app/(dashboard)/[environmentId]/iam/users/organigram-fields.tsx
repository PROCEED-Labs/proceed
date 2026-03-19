'use client';

import { Form, Select, Divider, Typography, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import useOrganizationRoles from './use-org-roles';
import { useQuery } from '@tanstack/react-query';
import { getSpaceUsers } from '@/lib/data/organigram';
import { isUserErrorResponse } from '@/lib/user-error';

function getUserDisplayName(user: { firstName?: string | null; lastName?: string | null }): string {
  return `${user.firstName} ${user.lastName}`;
}

function LabelWithTooltip({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      {label}
      <Tooltip title={tooltip}>
        <QuestionCircleOutlined style={{ color: '#888', cursor: 'pointer' }} />
      </Tooltip>
    </span>
  );
}

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

  const filteredUsers = (spaceUsers ?? []).filter((u) => u.id !== excludeUserId);

  return (
    <>
      <Divider />
      <Typography.Title level={5} style={{ marginBottom: '0.5rem' }}>
        Organisation Info
      </Typography.Title>

      <Form.Item
        label={
          <LabelWithTooltip
            label="Team / Department"
            tooltip="Specify the user's organizational team or department."
          />
        }
        name="teamRoleId"
      >
        <Select
          allowClear
          placeholder="Select team"
          options={(teamRoles ?? []).map((r) => ({ label: r.name, value: r.id }))}
        />
      </Form.Item>

      <Form.Item
        label={
          <LabelWithTooltip
            label="Direct Manager"
            tooltip="Specify the user's direct, organizational manager."
          />
        }
        name="directManagerId"
      >
        <Select
          allowClear
          placeholder="Select direct manager"
          options={filteredUsers.map((u) => ({
            label: getUserDisplayName(u),
            value: u.id,
          }))}
        />
      </Form.Item>

      <Form.Item
        label={
          <LabelWithTooltip
            label="Back Office"
            tooltip="Specify the user's organizational back office. (The user will not become a member of that role.)"
          />
        }
        name="backOfficeRoleId"
      >
        <Select
          allowClear
          placeholder="Select back office"
          options={(backOfficeRoles ?? []).map((r) => ({ label: r.name, value: r.id }))}
        />
      </Form.Item>
    </>
  );
}
