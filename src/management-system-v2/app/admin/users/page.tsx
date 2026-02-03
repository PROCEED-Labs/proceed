import { getCurrentUser } from '@/components/auth';
import { getUserOrganizationEnvironments } from '@/lib/data/db/iam/memberships';
import { getSystemAdminByUserId } from '@/lib/data/db/iam/system-admins';
import { deleteUser, getUsers } from '@/lib/data/db/iam/users';
import { notFound, redirect } from 'next/navigation';
import UserTable from './user-table';
import { UserErrorType, userError } from '@/lib/server-error-handling/user-error';
import Content from '@/components/content';
import { UserHasToDeleteOrganizationsError } from '@/lib/data/db/iam/users';
import { env } from '@/lib/ms-config/env-vars';
import { errorResponse } from '@/lib/server-error-handling/page-error-response';
import { Err, Result, ok } from 'neverthrow';

async function deleteUsers(userIds: string[]) {
  'use server';
  const currentUser = await getCurrentUser();
  if (currentUser.isErr()) {
    return errorResponse(currentUser);
  }
  const { systemAdmin } = currentUser.value;
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
  if (!env.PROCEED_PUBLIC_IAM_ACTIVE) return notFound();

  const user = await getCurrentUser();
  if (user.isErr()) {
    return errorResponse(user);
  }
  if (!user.value.session) redirect('/');

  const adminData = await getSystemAdminByUserId(user.value.userId);
  if (adminData.isErr()) {
    return errorResponse(adminData);
  }
  if (!adminData.value) redirect('/');

  async function getProcessedUsers(page: number = 1, pageSize: number = 10) {
    const userData = await getUsers(page, pageSize);
    if (userData.isErr()) return userData;

    const { users: paginatedUsers, pagination } = userData.value;

    const processedUsers = Result.combine(
      await Promise.all(
        paginatedUsers.map(async (user) => {
          const userOrgs = await getUserOrganizationEnvironments(user.id);
          if (userOrgs.isErr()) return userOrgs as Err<any, any>;

          const orgs = userOrgs.value.length;
          const ret = user.isGuest
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

          return ok(ret);
        }),
      ),
    );
    if (processedUsers.isErr()) {
      return processedUsers;
    }

    return ok({
      users: processedUsers.value,
      pagination,
    });
  }

  const proceedUsers = await getProcessedUsers();
  if (proceedUsers.isErr()) return errorResponse(proceedUsers);

  const { users } = proceedUsers.value;

  return (
    <Content title="MS users">
      <UserTable users={users} deleteUsers={deleteUsers} />
    </Content>
  );
}

export const dynamic = 'force-dynamic';
