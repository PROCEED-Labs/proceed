import { getCurrentUser } from '@/components/auth';
import { getUserOrganizationEnvironments } from '@/lib/data/DTOs';
import { getSystemAdminByUserId } from '@/lib/data/DTOs';
import { deleteUser, getUsers } from '@/lib/data/DTOs';
import { redirect } from 'next/navigation';
import UserTable from './user-table';
import { UserErrorType, userError } from '@/lib/user-error';
import Content from '@/components/content';
import { UserHasToDeleteOrganizationsError } from '@/lib/data/db/iam/users';

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

  const adminData = await getSystemAdminByUserId(user.userId);
  if (!adminData) redirect('/');

  async function getProcessedUsers(page: number = 1, pageSize: number = 10) {
    const { users: paginatedUsers, pagination } = await getUsers(page, pageSize);

    const processedUsers = await Promise.all(
      paginatedUsers.map(async (user) => {
        const orgs = (await getUserOrganizationEnvironments(user.id)).length;
        if (orgs > 0) {
          console.log(await getUserOrganizationEnvironments(user.id));
        }
        return user.isGuest
          ? {
              ...user,
              isGuest: false as const,
              email: '',
              username: 'Guest',
              firstName: 'Guest',
              lastName: '',
              orgs,
            }
          : { ...user, orgs };
      }),
    );

    return {
      users: processedUsers,
      pagination,
    };
  }

  const { users, pagination } = await getProcessedUsers();

  return (
    <Content title="MS users">
      <UserTable users={users} deleteUsers={deleteUsers} />
    </Content>
  );
}

export const dynamic = 'force-dynamic';
