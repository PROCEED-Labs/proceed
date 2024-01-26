import { getCurrentUser } from '@/components/auth';
import UserProfile from './user-profile';
import Content from '@/components/content';
import { getUserById } from '@/lib/data/legacy/iam/users';

const ProfilePage = async () => {
  const { userId } = await getCurrentUser();

  //TODO take guest into consideration

  const userData = getUserById(userId);

  return (
    <Content>
      <UserProfile userData={userData} />
    </Content>
  );
};

export default ProfilePage;
