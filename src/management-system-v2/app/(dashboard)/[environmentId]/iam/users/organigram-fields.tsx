'use client';

import { Form, Select, Divider, Typography, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import useOrganizationRoles from './use-org-roles';
import { useQuery } from '@tanstack/react-query';
import { getSpaceMembers } from '@/lib/data/organigram';
import { isUserErrorResponse } from '@/lib/user-error';
import styles from './organigram-fields.module.scss';

function LabelWithTooltip({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <span className={styles.labelWrapper}>
      {label}
      <Tooltip title={tooltip}>
        <QuestionCircleOutlined className={styles.helpIcon} />
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

  const { data: members } = useQuery({
    queryKey: ['space-members', spaceId],
    queryFn: async () => {
      const result = await getSpaceMembers(spaceId);
      if (isUserErrorResponse(result)) throw new Error();
      return result;
    },
  });

  const filteredMembers = (members ?? []).filter((m) => m.user.id !== excludeUserId);

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
          options={filteredMembers.map((m) => ({
            value: m.id,
            label: [m.user.firstName, m.user.lastName].filter(Boolean).join(' '),
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
