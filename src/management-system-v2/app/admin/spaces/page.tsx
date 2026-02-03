import { getCurrentUser } from '@/components/auth';
import {
  deleteEnvironment,
  getEnvironmentById,
  getEnvironments,
} from '@/lib/data/db/iam/environments';
import { getSystemAdminByUserId } from '@/lib/data/db/iam/system-admins';
import { redirect } from 'next/navigation';
import SpacesTable from './spaces-table';
import { UserErrorType, userError } from '@/lib/server-error-handling/user-error';
import Content from '@/components/content';
import { getSpaceRepresentation, getUserName } from './space-representation';
import { getUserOrganizationEnvironments } from '@/lib/data/db/iam/memberships';
import { getUserById } from '@/lib/data/db/iam/users';
import { Button, Space } from 'antd';
import { ReactNode } from 'react';
import { LeftOutlined } from '@ant-design/icons';
import { User } from '@/lib/data/user-schema';
import { Environment } from '@/lib/data/environment-schema';
import { errorResponse } from '@/lib/server-error-handling/page-error-response';
import { Result } from 'neverthrow';

async function deleteSpace(spaceIds: string[]) {
  'use server';
  const currentUser = await getCurrentUser();
  if (currentUser.isErr()) {
    return errorResponse(currentUser);
  }
  const { systemAdmin } = currentUser.value;
  if (!systemAdmin) return userError('Not a system admin', UserErrorType.PermissionError);

  // TODO: decide what to do if space is a personal space
  for (const spaceId of spaceIds) deleteEnvironment(spaceId);
}
export type deleteSpace = typeof deleteSpace;

export default async function SysteAdminDashboard(props: { params?: Promise<{ userId: string }> }) {
  const params = await props.params;
  const user = await getCurrentUser();
  if (user.isErr()) return errorResponse(user);
  if (!user.value.session) redirect('/');

  const adminData = await getSystemAdminByUserId(user.value.userId);
  if (adminData.isErr()) return errorResponse(adminData);
  if (!adminData.value) redirect('/');

  let spacesTableRepresentation;
  let title: ReactNode = 'MS Spaces';

  if (params?.userId) {
    const userId = decodeURIComponent(params.userId);
    const user = await getUserById(userId, { throwIfNotFound: false });
    if (user.isErr()) {
      return errorResponse(user);
    }
    if (!user.value) redirect('/admin/spaces');

    title = (
      <Space>
        <Button type="text" icon={<LeftOutlined />} href="/admin/spaces">
          Back to MS spaces
        </Button>
        {`${getUserName(user.value as User)}'s Spaces`}
      </Space>
    );

    const personalEnvironment = await getEnvironmentById(userId);
    if (personalEnvironment.isErr()) return errorResponse(personalEnvironment);
    const userSpaces: any[] = [personalEnvironment.value];

    const userOrgEnvs = await getUserOrganizationEnvironments(userId);
    if (userOrgEnvs.isErr()) return errorResponse(userOrgEnvs);
    const orgEnvironmentsPromises = userOrgEnvs.value.map(async (environmentId) => {
      return await getEnvironmentById(environmentId);
    });

    const orgEnvironments = Result.combine(await Promise.all(orgEnvironmentsPromises));
    if (orgEnvironments.isErr()) {
      return errorResponse(orgEnvironments);
    }

    userSpaces.push(...orgEnvironments.value);

    spacesTableRepresentation = await getSpaceRepresentation(userSpaces);
  } else {
    const environments = await getEnvironments();
    if (environments.isErr()) {
      return errorResponse(environments);
    }

    spacesTableRepresentation = await getSpaceRepresentation(environments.value as Environment[]);
  }

  if (spacesTableRepresentation.isErr()) return errorResponse(spacesTableRepresentation);

  return (
    <Content title={title}>
      <SpacesTable spaces={spacesTableRepresentation.value} deleteSpace={deleteSpace} />
    </Content>
  );
}

export const dynamic = 'force-dynamic';
