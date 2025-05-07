import { getCurrentUser } from '@/components/auth';
import UserProfile from './user-profile';
import Content from '@/components/content';
import { getUserById } from '@/lib/data/db/iam/users';
import { env } from '@/lib/env-vars';
import { notFound } from 'next/navigation';

const ProfilePage = async () => {
  const { userId } = await getCurrentUser();

  //TODO take guest into consideration

  const userData = await getUserById(userId);

  if (!env.PROCEED_PUBLIC_IAM_ACTIVATE) return notFound();

  return (
    <Content>
      <UserProfile userData={userData} />
    </Content>
  );
};

export default ProfilePage;
