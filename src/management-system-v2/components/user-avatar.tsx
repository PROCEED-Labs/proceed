import { Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { ComponentProps, forwardRef } from 'react';

type User =
  | {
      guest: true;
    }
  | {
      guest: false;
      firstName: string;
      lastName: string;
      image?: string;
    };

type UserAvatarProps = { user?: User; avatarProps?: ComponentProps<typeof Avatar> };

const UserAvatar = forwardRef<HTMLElement, UserAvatarProps>(({ user, avatarProps }, ref) => {
  if (!user) return <Avatar />;

  if (user.guest) return <Avatar icon={<UserOutlined />} />;

  return (
    <Avatar src={user.image} {...avatarProps} ref={ref}>
      {!user.image ? user.firstName.slice(0, 1) + user.lastName.slice(0, 1) : null}
    </Avatar>
  );
});

UserAvatar.displayName = 'UserAvatar';

export default UserAvatar;