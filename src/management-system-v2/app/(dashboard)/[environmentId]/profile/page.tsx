import { getCurrentUser } from '@/components/auth';
import UserProfile from './user-profile';
import Content from '@/components/content';
import { getUserById, getUserPassword } from '@/lib/data/db/iam/users';
import { notFound } from 'next/navigation';
import { env } from '@/lib/ms-config/env-vars';

const ProfilePage = async () => {
  const { userId } = await getCurrentUser();

  //TODO take guest into consideration

  const userData = await getUserById(userId);
  const userHasPassword = !!(await getUserPassword(userId));

  if (!env.PROCEED_PUBLIC_IAM_ACTIVE) return notFound();

  return (
    <Content>
      <UserProfile userData={userData} userHasPassword={userHasPassword} />
    </Content>
  );
};

export default ProfilePage;
