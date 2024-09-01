import { getCurrentUser } from '@/components/auth';
import UserProfile from './user-profile';
import Content from '@/components/content';
import { getUserById } from '@/lib/data/DTOs';
import { User } from '@/lib/data/user-schema';

const ProfilePage = async () => {
  const { userId } = await getCurrentUser();

  //TODO take guest into consideration

  const userData = await getUserById(userId);

  return (
    <Content>
      <UserProfile userData={userData} />
    </Content>
  );
};

export default ProfilePage;
