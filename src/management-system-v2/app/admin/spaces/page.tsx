import { getCurrentUser } from '@/components/auth';
import { deleteEnvironment, getEnvironments } from '@/lib/data/legacy/iam/environments';
import { getSystemAdminByUserId } from '@/lib/data/legacy/iam/system-admins';
import { getUserById } from '@/lib/data/legacy/iam/users';
import { User } from '@/lib/data/user-schema';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import SpacesTable from './spaces-table';
import { UserErrorType, userError } from '@/lib/user-error';
import Content from '@/components/content';
import { getSpaceReprensentation } from './space-representation';

async function deleteSpace(spaceIds: string[]) {
  'use server';
  const { systemAdmin } = await getCurrentUser();
  if (!systemAdmin) return userError('Not a system admin', UserErrorType.PermissionError);

  // TODO: decide what to do if space is a personal space
  for (const spaceId of spaceIds) deleteEnvironment(spaceId);
}
export type deleteSpace = typeof deleteSpace;

export default async function SysteAdminDashboard() {
  const user = await getCurrentUser();
  if (!user.session) redirect('/');

  const adminData = getSystemAdminByUserId(user.userId);
  if (!adminData) redirect('/');

  const spaces = getSpaceReprensentation(getEnvironments());

  return (
    <Content>
      <SpacesTable spaces={spaces} deleteSpace={deleteSpace} />
    </Content>
  );
}
