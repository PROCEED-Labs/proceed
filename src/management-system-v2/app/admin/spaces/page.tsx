import { getCurrentUser } from '@/components/auth';
import { deleteEnvironment, getEnvironments } from '@/lib/data/legacy/iam/environments';
import { getSystemAdminByUserId } from '@/lib/data/legacy/iam/system-admins';
import { getUserById } from '@/lib/data/legacy/iam/users';
import { User } from '@/lib/data/user-schema';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SpacesTable } from './spaces-table';
import { UserErrorType, userError } from '@/lib/user-error';
import Content from '@/components/content';

async function deleteSpace(spaceId: string) {
  'use server';
  const { systemAdmin } = await getCurrentUser();
  console.log('Deleting space', spaceId, systemAdmin);
  if (!systemAdmin) return userError('Not a system admin', UserErrorType.PermissionError);

  // TODO: decide what to do if space is a personal space
  deleteEnvironment(spaceId);
}
export type deleteSpace = typeof deleteSpace;

function getUserName(user: User) {
  if (user.guest) return 'Guest';
  if (user.username) return user.username;
  if (user.firstName || user.lastName)
    return `${user.firstName ?? '<no first name>'} ${user.lastName ?? '<no last name>'}`;
  return user.id;
}

export default async function SysteAdminDashboard() {
  const user = await getCurrentUser();
  if (!user.session) redirect('/');

  const adminData = getSystemAdminByUserId(user.userId);
  if (!adminData) redirect('/');

  const spaces = getEnvironments().map((space) => {
    if (space.organization && !space.active)
      return {
        id: space.id,
        name: <Link href={`/${space.id}/processes`}>{`${space.name}`}</Link>,
        type: 'Organization',
        owner: 'None',
      };

    const user = getUserById(space.organization ? space.ownerId : space.id);
    if (!user) throw new Error('Space user not found');
    const userName = getUserName(user);

    if (space.organization)
      return {
        id: space.id,
        name: <Link href={`/${space.id}/processes`}>{`${space.name}`}</Link>,
        type: 'Organization',
        owner: userName,
      };

    return {
      id: space.id,
      name: <Link href={`/${space.id}/processes`}>{`Personal space: ${userName}`}</Link>,
      type: 'Personal space',
      owner: userName,
    };
  });

  return <SpacesTable spaces={spaces} deleteSpace={deleteSpace} />;
}
