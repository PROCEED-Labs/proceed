import { getCurrentUser } from '@/components/auth';
import Content from '@/components/content';
import UnauthorizedFallback from '@/components/unauthorized-fallback';
import {
  addSystemAdmin,
  deleteSystemAdmin,
  getSystemAdminByUserId,
  getSystemAdmins,
} from '@/lib/data/legacy/iam/system-admins';
import { getUserById } from '@/lib/data/legacy/iam/users';
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
      const adminMapping = getSystemAdminByUserId(userId);
      if (!adminMapping) return userError('Admin not found');

      deleteSystemAdmin(adminMapping.id);
    }
  } catch (e) {
    return userError('Something went wrong');
  }
}
export type deleteAdmins = typeof deleteAdmins;

async function addAdmin(data: SystemAdminCreationInput) {
  'use server';
  const { systemAdmin } = await getCurrentUser();
  if (!systemAdmin || systemAdmin.role !== 'admin')
    return userError('Not a system admin', UserErrorType.PermissionError);

  try {
    return addSystemAdmin(data);
  } catch (e) {
    return userError('Something went wrong');
  }
}
export type addAdmin = typeof addAdmin;

export default async function ManageAdminsPage() {
  const user = await getCurrentUser();
  if (!user.session) redirect('/');
  const adminData = getSystemAdminByUserId(user.userId);
  if (!adminData) redirect('/');
  if (adminData.role !== 'admin') return <UnauthorizedFallback />;

  const systemAdmins = getSystemAdmins().map((admin) => {
    const user = getUserById(admin.userId) as AuthenticatedUser;
    return {
      ...user,
      role: admin.role,
    };
  });

  return (
    <Content title="System admins">
      <SystemAdminsTable admins={systemAdmins} deleteAdmins={deleteAdmins} addAdmin={addAdmin} />
    </Content>
  );
}
