import { Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { ComponentProps, forwardRef } from 'react';
import { User } from '@/lib/data/user-schema';

type UserAvatarProps = { user?: User; avatarProps?: ComponentProps<typeof Avatar> };

const UserAvatar = forwardRef<HTMLElement, UserAvatarProps>(({ user, avatarProps }, ref) => {
  if (!user) return <Avatar />;

  if (user.isGuest) return <Avatar icon={<UserOutlined />} />;

  return (
    <Avatar src={user.image && <img src={user.image} alt="avatar" />} {...avatarProps} ref={ref}>
      {!user.image ? (user.firstName || '').slice(0, 1) + (user.lastName || '').slice(0, 1) : null}
    </Avatar>
  );
});

UserAvatar.displayName = 'UserAvatar';

export default UserAvatar;
