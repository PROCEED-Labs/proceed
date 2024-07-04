import { getCurrentUser } from '@/components/auth';
import { getUserOrganizationEnvironments } from '@/lib/data/legacy/iam/memberships';
import { getSystemAdminByUserId } from '@/lib/data/legacy/iam/system-admins';
import {
  UserHasToDeleteOrganizationsError,
  deleteUser,
  getUsers,
} from '@/lib/data/legacy/iam/users';
import { redirect } from 'next/navigation';
import UserTable from './user-table';
import { UserErrorType, userError } from '@/lib/user-error';
import Content from '@/components/content';

async function deleteUsers(userIds: string[]) {
  'use server';
  const { systemAdmin } = await getCurrentUser();
  if (!systemAdmin) return userError('Not a system admin', UserErrorType.PermissionError);

  try {
    for (const userId of userIds) {
      deleteUser(userId);
    }
  } catch (e) {
    if (e instanceof UserHasToDeleteOrganizationsError)
      return userError("User is admin of organizations that don't have other admins.");
    return userError('Something went wrong on our side');
  }
}
export type deleteUsers = typeof deleteUsers;

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user.session) redirect('/');

  const adminData = getSystemAdminByUserId(user.userId);
  if (!adminData) redirect('/');

  const users = getUsers().map((user) => {
    const orgs = getUserOrganizationEnvironments(user.id).length;
    if (orgs > 0) console.log(getUserOrganizationEnvironments(user.id));

    if (user.guest || 'confluence' in user)
      return {
        ...user,
        guest: false as const,
        email: '',
        username: 'Guest',
        firstName: 'Guest',
        lastName: '',
        orgs,
      };

    return { ...user, orgs };
  });

  return (
    <Content title="MS users">
      <UserTable users={users} deleteUsers={deleteUsers} />
    </Content>
  );
}
