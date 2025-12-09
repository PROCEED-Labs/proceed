import { getCurrentUser } from '@/components/auth';
import UserProfile from './user-profile';
import Content from '@/components/content';
import { getUserById, getUserPassword } from '@/lib/data/db/iam/users';
import { notFound } from 'next/navigation';
import { env } from '@/lib/ms-config/env-vars';
import { errorResponse } from '@/lib/server-error-handling/page-error-response';

const ProfilePage = async () => {
  const currentUser = await getCurrentUser();
  if (currentUser.isErr()) {
    return errorResponse(currentUser);
  }
  const { userId } = currentUser.value;

  //TODO take guest into consideration

  const userData = await getUserById(userId);
  if (userData.isErr()) return errorResponse(userData);

  const userHasPassword = await getUserPassword(userId);
  if (userHasPassword && userHasPassword.isErr()) {
    return errorResponse(userHasPassword);
  }

  if (!env.PROCEED_PUBLIC_IAM_ACTIVE) return notFound();

  return (
    <Content>
      <UserProfile userData={userData.value} userHasPassword={!!userHasPassword.value} />
    </Content>
  );
};

export default ProfilePage;
