import { getCurrentUser } from '@/components/auth';
import { getEnvironments } from '@/lib/data/legacy/iam/environments';
import { getSystemAdminByUserId } from '@/lib/data/legacy/iam/system-admins';
import { getUserById } from '@/lib/data/legacy/iam/users';
import { User } from '@/lib/data/user-schema';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AdminPage } from './client-page';

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
        name: <Link href={`/${space.id}/processes`}>{`${space.name}`}</Link>,
        type: 'Organization',
        owner: 'None',
      };

    const user = getUserById(space.organization ? space.ownerId : space.id);
    if (!user) throw new Error('Space user not found');
    const userName = getUserName(user);

    if (space.organization)
      return {
        name: <Link href={`/${space.id}/processes`}>{`${space.name}`}</Link>,
        type: 'Organization',
        owner: userName,
      };

    return {
      name: <Link href={`/${space.id}/processes`}>{`Personal space: ${userName}`}</Link>,
      type: 'Personal space',
      owner: userName,
    };
  });

  return <AdminPage spaces={spaces} />;
}
