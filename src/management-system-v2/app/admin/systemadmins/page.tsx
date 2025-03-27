import { getCurrentUser } from '@/components/auth';
import Content from '@/components/content';
import UnauthorizedFallback from '@/components/unauthorized-fallback';
import {
  addSystemAdmin,
  deleteSystemAdmin,
  getSystemAdminByUserId,
  getSystemAdmins,
} from '@/lib/data/DTOs';
import { getUserById, getUsers } from '@/lib/data/DTOs';
import { AuthenticatedUser } from '@/lib/data/user-schema';
import { UserErrorType, userError } from '@/lib/user-error';
import { redirect } from 'next/navigation';
import SystemAdminsTable from './admins-table';
import { SystemAdminCreationInput } from '@/lib/data/system-admin-schema';

async function deleteAdmins(userIds: string[]) {
  'use server';
  const { systemAdmin } = await getCurrentUser();
  if (!systemAdmin || systemAdmin.role !== 'admin')
    return userError('Not a system admin', UserErrorType.PermissionError);

  try {
    for (const userId of userIds) {
      const adminMapping = await getSystemAdminByUserId(userId);
      if (!adminMapping) return userError('Admin not found');

      deleteSystemAdmin(adminMapping.id);
    }
  } catch (e) {
    return userError('Something went wrong');
  }
}
export type deleteAdmins = typeof deleteAdmins;

async function addAdmin(admins: SystemAdminCreationInput[]) {
  'use server';
  const { systemAdmin } = await getCurrentUser();
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
  const { systemAdmin } = await getCurrentUser();
  if (!systemAdmin || systemAdmin.role !== 'admin')
    return userError('Not a system admin', UserErrorType.PermissionError);

  try {
    const systemAdmins = await getSystemAdmins();
    const { users, pagination } = await getUsers(page, pageSize);

    const filteredUsers = users.filter(
      (user) => !user.isGuest && !systemAdmins.some((admin) => admin.userId === user.id),
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
  const user = await getCurrentUser();
  if (!user.session) redirect('/');
  const adminData = await getSystemAdminByUserId(user.userId);
  if (!adminData) redirect('/');
  if (adminData.role !== 'admin') return <UnauthorizedFallback />;

  const getFullSystemAdmins = async (): Promise<(AuthenticatedUser & { role: 'admin' })[]> => {
    const admins = await getSystemAdmins();
    return Promise.all(
      admins.map(async (admin) => {
        const user = (await getUserById(admin.userId)) as AuthenticatedUser;
        return { ...user, role: admin.role };
      }),
    );
  };

  const adminsList = await getFullSystemAdmins();

  return (
    <Content title="System admins">
      <SystemAdminsTable
        admins={adminsList}
        deleteAdmins={deleteAdmins}
        addAdmin={addAdmin}
        getNonAdminUsers={getNonAdminUsers}
      />
    </Content>
  );
}

export const dynamic = 'force-dynamic';
