import { getCurrentUser } from '@/components/auth';
import {
  deleteEnvironment,
  getEnvironmentById,
  getEnvironments,
} from '@/lib/data/legacy/iam/environments';
import { getSystemAdminByUserId } from '@/lib/data/legacy/iam/system-admins';
import { redirect } from 'next/navigation';
import SpacesTable from './spaces-table';
import { UserErrorType, userError } from '@/lib/user-error';
import Content from '@/components/content';
import { getSpaceRepresentation, getUserName } from './space-representation';
import { getUserOrganizationEnvironments } from '@/lib/data/legacy/iam/memberships';
import { getUserById } from '@/lib/data/legacy/iam/users';
import { Environment } from '@/lib/data/environment-schema';
import { Button, Space } from 'antd';
import { ReactNode } from 'react';
import { LeftOutlined } from '@ant-design/icons';

async function deleteSpace(spaceIds: string[]) {
  'use server';
  const { systemAdmin } = await getCurrentUser();
  if (!systemAdmin) return userError('Not a system admin', UserErrorType.PermissionError);

  // TODO: decide what to do if space is a personal space
  for (const spaceId of spaceIds) deleteEnvironment(spaceId);
}
export type deleteSpace = typeof deleteSpace;

export default async function SysteAdminDashboard({ params }: { params?: { userId: string } }) {
  const user = await getCurrentUser();
  if (!user.session) redirect('/');
  const adminData = getSystemAdminByUserId(user.userId);
  if (!adminData) redirect('/');

  let spacesTableRepresentation;
  let title: ReactNode = 'MS Spaces';

  if (params?.userId) {
    const userId = decodeURIComponent(params.userId);
    const user = getUserById(userId, { throwIfNotFound: false });
    if (!user) redirect('/admin/spaces');

    title = (
      <Space>
        <Button type="text" icon={<LeftOutlined />} href="/admin/spaces">
          Back to MS spaces
        </Button>
        {`${getUserName(user)}'s Spaces`}
      </Space>
    );

    const userSpaces: Environment[] = [{ id: userId, organization: false, ownerId: userId }];
    userSpaces.push(
      ...getUserOrganizationEnvironments(userId).map((spaceId) => getEnvironmentById(spaceId)),
    );

    spacesTableRepresentation = getSpaceRepresentation(userSpaces);
  } else {
    spacesTableRepresentation = getSpaceRepresentation(getEnvironments());
  }

  return (
    <Content title={title}>
      <SpacesTable spaces={spacesTableRepresentation} deleteSpace={deleteSpace} />
    </Content>
  );
}
