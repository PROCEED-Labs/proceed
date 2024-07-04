import { Avatar as AntDesignAvatar, Typography } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { ComponentProps, forwardRef } from 'react';
import Avatar from 'boring-avatars';

type UserAvatarProps = {
  user?: {
    id: string;
    image?: string | null;
    guest?: boolean | null;
    firstName?: string | null;
    lastName?: string | null;
  };
  avatarProps?: ComponentProps<typeof AntDesignAvatar>;
};

const UserAvatar = forwardRef<HTMLElement, UserAvatarProps>(({ user, avatarProps }, ref) => {
  if (!user) return <AntDesignAvatar />;

  if (user.guest || 'confluence' in user) return <AntDesignAvatar icon={<UserOutlined />} />;

  const icon = user.image ? (
    <img src={user.image} alt="avatar" />
  ) : (
    <Avatar
      size={64}
      name={user.id}
      variant="marble"
      colors={['#51843A', '#599140', '#62A046', '#780116', '#982D28', '#B85939', '#F7B05B']}
    />
  );

  return (
    <AntDesignAvatar
      style={{ position: 'relative' }}
      src={
        <>
          {icon}
          <Typography.Text
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            {!user.image
              ? (user.firstName || '').slice(0, 1) + (user.lastName || '').slice(0, 1)
              : null}
          </Typography.Text>
        </>
      }
      {...avatarProps}
      ref={ref}
    ></AntDesignAvatar>
  );
});

UserAvatar.displayName = 'UserAvatar';

export default UserAvatar;
