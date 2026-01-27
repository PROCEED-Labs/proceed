import { getCurrentUser } from '@/components/auth';
import Content from '@/components/content';
import UnauthorizedFallback from '@/components/unauthorized-fallback';
import {
  addSystemAdmin,
  deleteSystemAdmin,
  getSystemAdminByUserId,
  getSystemAdmins,
} from '@/lib/data/db/iam/system-admins';
import { getUserById, getUsers } from '@/lib/data/db/iam/users';
import { AuthenticatedUser } from '@/lib/data/user-schema';
import { UserErrorType, getErrorMessage, userError } from '@/lib/server-error-handling/user-error';
import { notFound, redirect } from 'next/navigation';
import SystemAdminsTable from './admins-table';
import { SystemAdminCreationInput } from '@/lib/data/system-admin-schema';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import { errorResponse } from '@/lib/server-error-handling/page-error-response';
import { Result, ok } from 'neverthrow';

async function deleteAdmins(userIds: string[]) {
  'use server';
  const currentUser = await getCurrentUser();
  if (currentUser.isErr()) {
    return errorResponse(currentUser);
  }
  const { systemAdmin } = currentUser.value;
  if (!systemAdmin || systemAdmin.role !== 'admin')
    return userError('Not a system admin', UserErrorType.PermissionError);

  try {
    for (const userId of userIds) {
      const adminMapping = await getSystemAdminByUserId(userId);
      if (adminMapping.isErr()) {
        return userError(getErrorMessage(adminMapping.error));
      }
      if (!adminMapping.value) return userError('Admin not found');

      deleteSystemAdmin(adminMapping.value.id);
    }
  } catch (e) {
    return userError('Something went wrong');
  }
}
export type deleteAdmins = typeof deleteAdmins;

async function addAdmin(admins: SystemAdminCreationInput[]) {
  'use server';
  const currentUser = await getCurrentUser();
  if (currentUser.isErr()) {
    return errorResponse(currentUser);
  }
  const { systemAdmin } = currentUser.value;
  if (!systemAdmin || systemAdmin.role !== 'admin')
    return userError('Not a system admin', UserErrorType.PermissionError);

  try {
    for (const admin of admins) {
      addSystemAdmin(admin);
    }
  } catch (e) {
    return userError('Something went wrong');
  }
}
export type addAdmin = typeof addAdmin;

async function getNonAdminUsers(page: number = 1, pageSize: number = 10) {
  'use server';
  const currentUser = await getCurrentUser();
  if (currentUser.isErr()) {
    return userError(getErrorMessage(currentUser.error));
  }

  const { systemAdmin } = currentUser.value;
  if (!systemAdmin || systemAdmin.role !== 'admin')
    return userError('Not a system admin', UserErrorType.PermissionError);

  try {
    const systemAdmins = await getSystemAdmins();
    if (systemAdmins.isErr()) {
      return userError(getErrorMessage(systemAdmins.error));
    }

    const usersResult = await getUsers(page, pageSize);
    if (usersResult.isErr()) return userError(getErrorMessage(usersResult.error));

    const { users, pagination } = usersResult.value;

    const filteredUsers = users.filter(
      (user) => !user.isGuest && !systemAdmins.value.some((admin) => admin.userId === user.id),
    ) as AuthenticatedUser[];

    const totalFilteredUsers = filteredUsers.length;
    const totalPages = Math.ceil(totalFilteredUsers / pageSize);

    return {
      users: filteredUsers,
      pagination: {
        ...pagination,
        totalUsers: totalFilteredUsers,
        totalPages,
      },
    };
  } catch (e) {
    return userError('Something went wrong');
  }
}
export type getNonAdminUsers = typeof getNonAdminUsers;

export default async function ManageAdminsPage() {
  const msConfig = await getMSConfig();
  if (!msConfig.PROCEED_PUBLIC_IAM_ACTIVE) return notFound();

  const user = await getCurrentUser();
  if (user.isErr()) return errorResponse(user);
  if (!user.value.session) redirect('/');

  const adminData = await getSystemAdminByUserId(user.value.userId);
  if (adminData.isErr()) {
    return errorResponse(adminData);
  }
  if (!adminData.value) redirect('/');
  if (adminData.value.role !== 'admin') return <UnauthorizedFallback />;

  const getFullSystemAdmins = async () => {
    const admins = await getSystemAdmins();
    if (admins.isErr()) return admins;

    return Result.combine(
      await Promise.all(
        admins.value.map(async (admin) => {
          const user = await getUserById(admin.userId);
          if (user.isErr()) {
            return user;
          }

          // TODO: handle that the user might not be found (can that happen?)

          return ok({ ...(user.value as AuthenticatedUser), role: admin.role });
        }),
      ),
    );
  };

  const adminsList = await getFullSystemAdmins();
  if (adminsList.isErr()) {
    return errorResponse(adminsList);
  }

  return (
    <Content title="System admins">
      <SystemAdminsTable
        admins={adminsList.value as (AuthenticatedUser & { role: 'admin' })[]}
        deleteAdmins={deleteAdmins}
        addAdmin={addAdmin}
        getNonAdminUsers={getNonAdminUsers}
      />
    </Content>
  );
}

export const dynamic = 'force-dynamic';
