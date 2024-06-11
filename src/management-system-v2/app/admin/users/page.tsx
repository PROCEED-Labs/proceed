import { getCurrentUser } from '@/components/auth';
import { getSystemAdminByUserId } from '@/lib/data/legacy/iam/system-admins';
import { redirect } from 'next/navigation';

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user.session) redirect('/');

  const adminData = getSystemAdminByUserId(user.userId);
  if (!adminData) redirect('/');

  return 'TODO';
}
