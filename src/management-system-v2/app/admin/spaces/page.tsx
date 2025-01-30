import { getCurrentUser } from '@/components/auth';
import { deleteEnvironment, getEnvironmentById, getEnvironments } from '@/lib/data/DTOs';
import { getSystemAdminByUserId } from '@/lib/data/DTOs';
import { redirect } from 'next/navigation';
import SpacesTable from './spaces-table';
import { UserErrorType, userError } from '@/lib/user-error';
import Content from '@/components/content';
import { getSpaceRepresentation, getUserName } from './space-representation';
import { getUserOrganizationEnvironments } from '@/lib/data/DTOs';
import { getUserById } from '@/lib/data/DTOs';
import { Button, Space } from 'antd';
import { ReactNode } from 'react';
import { LeftOutlined } from '@ant-design/icons';
import { User } from '@/lib/data/user-schema';

async function deleteSpace(spaceIds: string[]) {
  'use server';
  const { systemAdmin } = await getCurrentUser();
  if (!systemAdmin) return userError('Not a system admin', UserErrorType.PermissionError);

  // TODO: decide what to do if space is a personal space
  for (const spaceId of spaceIds) deleteEnvironment(spaceId);
}
export type deleteSpace = typeof deleteSpace;

export default async function SysteAdminDashboard({ params }: AsyncPageProps) {
  const user = await getCurrentUser();
  if (!user.session) redirect('/');
  const adminData = getSystemAdminByUserId(user.userId);
  if (!adminData) redirect('/');

  let spacesTableRepresentation;
  let title: ReactNode = 'MS Spaces';

  const userId = decodeURIComponent((await params).userId);
  if (userId) {
    const user = await getUserById(userId, { throwIfNotFound: false });
    if (!user) redirect('/admin/spaces');

    title = (
      <Space>
        <Button type="text" icon={<LeftOutlined />} href="/admin/spaces">
          Back to MS spaces
        </Button>
        {`${getUserName(user as User)}'s Spaces`}
      </Space>
    );

    const userSpaces: any[] = [await getEnvironmentById(userId)];
    const userOrgEnvs = await getUserOrganizationEnvironments(userId);
    const orgEnvironmentsPromises = userOrgEnvs.map(async (environmentId) => {
      return await getEnvironmentById(environmentId);
    });

    const orgEnvironments = await Promise.all(orgEnvironmentsPromises);

    userSpaces.push(...orgEnvironments);

    spacesTableRepresentation = await getSpaceRepresentation(userSpaces);
  } else {
    spacesTableRepresentation = await getSpaceRepresentation(await getEnvironments());
  }

  return (
    <Content title={title}>
      <SpacesTable spaces={spacesTableRepresentation} deleteSpace={deleteSpace} />
    </Content>
  );
}
